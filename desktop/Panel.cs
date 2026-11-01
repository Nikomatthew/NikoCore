using System;
using System.Drawing;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System.Runtime.InteropServices;
using System.Threading.Tasks;

class PanelTab : Button {
    public bool ActiveTab;
    protected override bool ShowFocusCues { get { return false; } }
    protected override void OnPaint(PaintEventArgs e){
        e.Graphics.Clear(BackColor);
        TextRenderer.DrawText(e.Graphics,Text,Font,ClientRectangle,ForeColor,TextFormatFlags.HorizontalCenter|TextFormatFlags.VerticalCenter);
        if(ActiveTab)using(var brush=new SolidBrush(Color.FromArgb(142,180,240)))e.Graphics.FillRectangle(brush,20,Height-3,Width-40,2);
    }
}

class PanelWindow : Form {
    static string startupLog;
    static void Trace(string message){try{if(startupLog!=null)File.AppendAllText(startupLog,DateTime.UtcNow.ToString("o")+" "+message+Environment.NewLine);}catch{}}
    [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hwnd, int command);
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hwnd);
    readonly WebView2[] views = new WebView2[3];
    readonly PanelTab[] tabs = new PanelTab[3];
    readonly Task[] initializing = new Task[3];
    readonly bool[] ready = new bool[3];
    Task<CoreWebView2Environment> mainEnvironment;
    Task<CoreWebView2Environment> snowEnvironment;
    readonly Uri[] targets;
    readonly string profile;
    readonly string instance;
    readonly System.Windows.Forms.Timer timer = new System.Windows.Forms.Timer();
    bool closing;
    int selectedPanel;
    bool lightTheme;
    System.Windows.Forms.Panel navigation;
    System.Windows.Forms.Panel navigationLine;
    Button refreshButton;
    void ApplyTheme(bool light){
        lightTheme=light;
        var background=light?Color.FromArgb(243,243,239):Color.FromArgb(13,18,28);
        BackColor=background;
        if(navigation!=null)navigation.BackColor=background;
        if(navigationLine!=null)navigationLine.BackColor=light?Color.FromArgb(218,222,215):Color.FromArgb(37,46,61);
        if(refreshButton!=null){refreshButton.BackColor=background;refreshButton.ForeColor=light?Color.FromArgb(72,82,75):Color.FromArgb(167,182,202);refreshButton.FlatAppearance.MouseOverBackColor=light?Color.FromArgb(228,233,224):Color.FromArgb(24,33,48);}
        for(int i=0;i<tabs.Length;i++){if(tabs[i]==null)continue;tabs[i].BackColor=i==selectedPanel?(light?Color.FromArgb(228,233,224):Color.FromArgb(23,31,45)):background;tabs[i].ForeColor=i==selectedPanel?(light?Color.FromArgb(35,41,32):Color.FromArgb(230,237,248)):(light?Color.FromArgb(106,116,101):Color.FromArgb(137,151,171));tabs[i].Invalidate();}
        if(IsHandleCreated){int dark=light?0:1,caption=ColorTranslator.ToWin32(background),text=ColorTranslator.ToWin32(light?Color.FromArgb(35,41,32):Color.FromArgb(230,237,248));try{DwmSetWindowAttribute(Handle,20,ref dark,4);DwmSetWindowAttribute(Handle,35,ref caption,4);DwmSetWindowAttribute(Handle,36,ref text,4);}catch{}}
    }
    protected override CreateParams CreateParams {
        get { var value=base.CreateParams;value.ExStyle|=0x00400000|0x00100000;return value; }
    }
    PanelWindow(Uri[] urls, string data, string identity) {
        Trace("window constructor entered");
        targets=urls; profile=data; instance=identity;
        Text=""; Width=1320; Height=860; MinimumSize=new Size(920,620); StartPosition=FormStartPosition.CenterScreen;
        Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath);ShowIcon=true;KeyPreview=true;
        KeyDown+=(s,e)=>{if(e.KeyCode==Keys.F5||(e.Control&&e.KeyCode==Keys.R)){RefreshPanel();e.Handled=true;e.SuppressKeyPress=true;}};
        BackColor=Color.FromArgb(12,16,24); ForeColor=Color.White;
        Trace("window properties ready");
        var top=new System.Windows.Forms.Panel { Dock=DockStyle.Top, Height=44, BackColor=Color.FromArgb(13,18,28) };
        navigation=top;
        var separator=new System.Windows.Forms.Panel { Dock=DockStyle.Bottom, Height=1, BackColor=Color.FromArgb(37,46,61) };top.Controls.Add(separator);
        navigationLine=separator;
        string[] labels={"NikoLink","NikoLinkTask","SnowLuma"};
        for(int i=0;i<3;i++) { int index=i; var button=new PanelTab { Text=labels[i], FlatStyle=FlatStyle.Flat, Size=new Size(138,42), Location=new Point(16+i*142,0), Font=new Font("Segoe UI",9.5f), ForeColor=Color.FromArgb(137,151,171), BackColor=top.BackColor, Cursor=Cursors.Hand, TabIndex=i, UseVisualStyleBackColor=false };button.FlatAppearance.BorderSize=0;button.Click+=(s,e)=>SelectPanel(index);tabs[i]=button;top.Controls.Add(button); }
        var refresh=new Button { Text="刷新  ·  F5", FlatStyle=FlatStyle.Flat, Size=new Size(96,30), Location=new Point(ClientSize.Width-112,6), Anchor=AnchorStyles.Top|AnchorStyles.Right, Font=new Font("Segoe UI",9), ForeColor=Color.FromArgb(167,182,202), BackColor=top.BackColor, Cursor=Cursors.Hand, UseVisualStyleBackColor=false };refresh.FlatAppearance.BorderSize=0;refresh.FlatAppearance.MouseOverBackColor=Color.FromArgb(24,33,48);refresh.Click+=(s,e)=>RefreshPanel();top.Controls.Add(refresh);
        var content=new System.Windows.Forms.Panel { Dock=DockStyle.Fill };Controls.Add(content);Controls.Add(top);
        refreshButton=refresh;ApplyTheme(false);
        Trace("navigation ready");
        for(int i=0;i<3;i++){views[i]=new WebView2 { Dock=DockStyle.Fill, Visible=false, DefaultBackgroundColor=Color.FromArgb(16,23,37) };content.Controls.Add(views[i]);}
        Shown+=async(s,e)=>{Trace("window shown");File.WriteAllText(Path.Combine(profile,"panel-ready"),System.Diagnostics.Process.GetCurrentProcess().Id.ToString());Activate();int dark=1,black=0;try{DwmSetWindowAttribute(Handle,20,ref dark,4);DwmSetWindowAttribute(Handle,35,ref black,4);}catch{}await OpenPanel(0);};
        timer.Interval=700;timer.Tick+=(s,e)=>{try{var stop=Path.Combine(profile,"panel-stop");if(File.Exists(stop)){File.Delete(stop);Close();return;}var signal=Path.Combine(profile,"panel-focus");if(File.Exists(signal)){File.Delete(signal);if(WindowState==FormWindowState.Minimized)WindowState=FormWindowState.Normal;ShowWindow(Handle,9);SetForegroundWindow(Handle);}}catch{}};timer.Start();
        FormClosed+=(s,e)=>{closing=true;timer.Stop();timer.Dispose();foreach(var view in views)view.Dispose();try{var file=Path.Combine(profile,"panel-ready");if(File.Exists(file)&&File.ReadAllText(file)==System.Diagnostics.Process.GetCurrentProcess().Id.ToString())File.Delete(file);}catch{}Trace("window closed");};
        Trace("window constructor completed");
    }
    async System.Threading.Tasks.Task OpenPanel(int index) {
        if(closing)return;
        selectedPanel=index;
        for(int i=0;i<3;i++){views[i].Visible=i==index;tabs[i].ActiveTab=i==index;tabs[i].BackColor=i==index?Color.FromArgb(23,31,45):Color.FromArgb(13,18,28);tabs[i].ForeColor=i==index?Color.FromArgb(230,237,248):Color.FromArgb(137,151,171);tabs[i].Invalidate();}
        ApplyTheme(lightTheme);
        if(ready[index])return;
        if(targets[index]==null){MessageBox.Show("SnowLuma控制台地址尚未配置。请先在NikoLink的QQ接入中配置。","NikoLink");return;}
        if(initializing[index]!=null){await initializing[index];return;}
        initializing[index]=InitializePanel(index);
        try{await initializing[index];}finally{initializing[index]=null;}
    }
    async Task InitializePanel(int index){
        var view=views[index];
        try {
            Trace("initialize panel="+index);
            if(index==2){if(snowEnvironment==null)snowEnvironment=CoreWebView2Environment.CreateAsync(null,Path.Combine(profile,"snowluma"));}
            else if(mainEnvironment==null)mainEnvironment=CoreWebView2Environment.CreateAsync(null,Path.Combine(profile,"nikolink"));
            var environment=await (index==2?snowEnvironment:mainEnvironment);
            if(closing)return;
            await view.EnsureCoreWebView2Async(environment);
            if(closing)return;
            view.CoreWebView2.Settings.AreDevToolsEnabled=false;
            view.CoreWebView2.Settings.IsWebMessageEnabled=false;
            if(index<2){
                view.CoreWebView2.Settings.IsWebMessageEnabled=true;
                view.CoreWebView2.WebMessageReceived+=(sender,eventArgs)=>{try{Uri source;if(!Uri.TryCreate(eventArgs.Source,UriKind.Absolute,out source)||source.GetLeftPart(UriPartial.Authority)!=targets[index].GetLeftPart(UriPartial.Authority)||!(source.AbsolutePath=="/"||source.AbsolutePath=="/console.html"||source.AbsolutePath=="/tasks"))return;var message=eventArgs.TryGetWebMessageAsString();if(message=="nikolink-theme:light")ApplyTheme(true);else if(message=="nikolink-theme:dark")ApplyTheme(false);}catch{}};
                const string themeBridge="(()=>{if(window!==window.top)return;const send=()=>window.chrome.webview.postMessage('nikolink-theme:'+(document.documentElement.dataset.theme==='light'?'light':'dark'));const init=()=>{send();new MutationObserver(send).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});};if(document.documentElement)init();else document.addEventListener('DOMContentLoaded',init,{once:true});})()";
                await view.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(themeBridge);
            }
            view.CoreWebView2.Settings.AreHostObjectsAllowed=false;
            view.CoreWebView2.NewWindowRequested+=(s,e)=>{e.Handled=true;if(!e.IsUserInitiated||closing)return;OpenExternalLink(e.Uri);};
            view.CoreWebView2.NavigationStarting+=(s,e)=>{Uri uri;if(!Uri.TryCreate(e.Uri,UriKind.Absolute,out uri)||uri.GetLeftPart(UriPartial.Authority)!=targets[index].GetLeftPart(UriPartial.Authority))e.Cancel=true;};
            view.CoreWebView2.PermissionRequested+=(s,e)=>{e.State=CoreWebView2PermissionState.Deny;};
            view.CoreWebView2.ProcessFailed+=(s,e)=>{ready[index]=false;Trace("webview process failed panel="+index+" kind="+e.ProcessFailedKind);if(!closing)MessageBox.Show("当前页面进程异常，请关闭面板后重新打开。后台与存档不会因此停止。","NikoLink");};
            view.CoreWebView2.NavigationCompleted+=(s,e)=>{Trace("navigation panel="+index+" success="+e.IsSuccess+" status="+e.WebErrorStatus);};
            view.CoreWebView2.Navigate(targets[index].AbsoluteUri);
            ready[index]=true;Trace("initialized panel="+index);
        } catch(Exception e) {Trace("initialize failed panel="+index+" type="+e.GetType().Name+" code="+e.HResult);if(!closing)MessageBox.Show("无法打开WebView面板，请检查面板日志及Microsoft Edge WebView2运行时。","NikoLink");}
    }
    async void SelectPanel(int index){await OpenPanel(index);}
    void OpenExternalLink(string value){
        Uri uri;if(String.IsNullOrWhiteSpace(value)||value.Length>4096||!Uri.TryCreate(value,UriKind.Absolute,out uri)||!(uri.Scheme=="https"||uri.Scheme=="http")||!String.IsNullOrEmpty(uri.UserInfo))return;
        try{System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(uri.AbsoluteUri){UseShellExecute=true});}
        catch(Exception e){Trace("external browser failed type="+e.GetType().Name);if(!closing)MessageBox.Show("无法打开默认浏览器，请检查系统浏览器设置。","NikoLink");}
    }
    async void RefreshPanel(){if(closing)return;int index=selectedPanel;try{Trace("refresh requested panel="+index);if(initializing[index]!=null)await initializing[index];if(closing)return;if(!ready[index]){await OpenPanel(index);return;}views[index].CoreWebView2.Stop();views[index].CoreWebView2.Reload();Trace("refresh dispatched panel="+index);}catch(Exception e){ready[index]=false;Trace("refresh failed panel="+index+" type="+e.GetType().Name+" code="+e.HResult);if(!closing)MessageBox.Show("页面刷新未完成，请重新打开面板。后台未停止。","NikoLink");}}
    static Uri Local(string value){Uri uri;if(!Uri.TryCreate(value,UriKind.Absolute,out uri)||uri.Scheme!="http"||!(uri.Host=="127.0.0.1"||uri.Host=="localhost")||!String.IsNullOrEmpty(uri.UserInfo))throw new Exception("仅允许本机控制台地址");return uri;}
    [STAThread] static void Main(string[] args) {
        try {
            if(args.Length<2)throw new Exception("请由NikoLink启动面板");
            var home=Path.GetFullPath(args[1]);Directory.CreateDirectory(home);
            var logs=Path.Combine(home,"log");Directory.CreateDirectory(logs);foreach(var file in Directory.GetFiles(logs,"panel-*.log")){if(File.GetLastWriteTimeUtc(file)<DateTime.UtcNow.AddDays(-3))File.Delete(file);}startupLog=Path.Combine(logs,"panel-"+DateTime.UtcNow.ToString("yyyy-MM-dd")+".log");Trace("panel entry");
            string identity;using(var hash=SHA256.Create())identity=BitConverter.ToString(hash.ComputeHash(Encoding.UTF8.GetBytes(home.ToLowerInvariant()))).Replace("-","");
            bool created;using(var mutex=new Mutex(true,"Local\\NikoLinkPanel-"+identity,out created)){
                Trace("single instance created="+created);
                if(!created){File.WriteAllText(Path.Combine(home,"panel-focus"),"focus");return;}
                Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
                Application.ThreadException+=(s,e)=>{Trace("UI exception type="+e.Exception.GetType().Name+" code="+e.Exception.HResult);MessageBox.Show("面板发生异常，详情已写入日志。请关闭后重新打开。","NikoLink");};
                Trace("visual styles ready");
                var main=Local(args[0]);var urls=new[]{main,new Uri(main,"tasks"),args.Length>2&&!String.IsNullOrEmpty(args[2])?Local(args[2]):null};
                Application.Run(new PanelWindow(urls,home,identity));
            }
        }catch(Exception e){MessageBox.Show(e.Message,"NikoLink");}
    }
}
