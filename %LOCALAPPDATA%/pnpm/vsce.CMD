@SETLOCAL
@IF NOT DEFINED NODE_PATH (
  @SET "NODE_PATH=%LOCALAPPDATA%\pnpm\global\5\.pnpm\node_modules"
) ELSE (
  @SET "NODE_PATH=%NODE_PATH%;%LOCALAPPDATA%\pnpm\global\5\.pnpm\node_modules"
)
@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\global\5\node_modules\vsce\vsce" %*
) ELSE (
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "%~dp0\global\5\node_modules\vsce\vsce" %*
)
