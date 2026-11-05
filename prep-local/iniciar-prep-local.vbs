' Arranca Prep Local sin ventana. Copia un acceso directo de este archivo en shell:startup
Set sh = CreateObject("WScript.Shell")
dir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir
sh.Run "cmd /c if not exist datos mkdir datos & node prep-local.js >> datos\registro.txt 2>&1", 0, False
