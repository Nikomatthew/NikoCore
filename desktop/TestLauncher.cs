using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Windows.Forms;
class TestLauncher{
 static int Run(string node,string home,string script,bool online,out string details){
  var start=new ProcessStartInfo(node,"\""+Path.Combine(home,"scripts",script)+"\""+(online?" --online":"")){WorkingDirectory=home,UseShellExecute=false,CreateNoWindow=true,RedirectStandardError=true,RedirectStandardOutput=true,StandardErrorEncoding=Encoding.UTF8,StandardOutputEncoding=Encoding.UTF8};
  using(var child=Process.Start(start)){var error=child.StandardError.ReadToEndAsync();var output=child.StandardOutput.ReadToEndAsync();child.WaitForExit();details=error.Result+"\n"+output.Result;return child.ExitCode;}
 }
 [STAThread] static void Main(){try{
  var home=Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"..",".."));
  var node=Environment.GetEnvironmentVariable("NIKOLINK_TEST_NODE");
  if(String.IsNullOrEmpty(node))node="node.exe";
  var online=Path.GetFileName(Application.ExecutablePath).IndexOf("Online",StringComparison.OrdinalIgnoreCase)>=0;
  string details;var code=Run(node,home,"test-desktop-source.mjs",online,out details);
  if(code==42){
   var decision=MessageBox.Show("检测到测试后台仍在运行旧版本。\n\n是否停止旧测试后台并加载新版？正在执行的测试任务可能中断，存档保留。\n仅处理当前独立测试实例，不停止私人V2。\n\n选择“取消”不会停止后台。","NikoLink 测试后台更新",MessageBoxButtons.OKCancel,MessageBoxIcon.Information,MessageBoxDefaultButton.Button2);
   if(decision!=DialogResult.OK)return;
   code=Run(node,home,"stop-desktop-source-test.mjs",online,out details);
   if(code==0)code=Run(node,home,"test-desktop-source.mjs",online,out details);
  }
  if(code!=0)MessageBox.Show(details,"NikoLink 独立测试启动失败",MessageBoxButtons.OK,MessageBoxIcon.Error);
 }catch(Exception e){MessageBox.Show(e.Message,"NikoLink 独立测试");}}
}
