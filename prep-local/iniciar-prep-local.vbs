' Arranca Prep Local sin ventana. El instalador deja un acceso directo en shell:startup.
' El registro queda en datos\registro.txt (lo escribe el propio programa).
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir
node = sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\nodejs\node.exe"
If Not fso.FileExists(node) Then node = "node"
sh.Run """" & node & """ """ & dir & "\prep-local.js""", 0, False
