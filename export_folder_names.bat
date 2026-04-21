@echo off

setlocal

chcp 65001 >nul


set "SOURCE_DIR=S:\УСЗН Хоста\Email"
REM Путь к папке, из которой нужно выгрузить названия вложенных папок.
set "OUT_FILE=%~dp0folder_names.txt"
REM Путь к итоговому TXT-файлу (%~dp0 = папка, где лежит сам .bat).

REM Запускаем встроенный PowerShell:
REM - NoProfile: не загружать профиль пользователя (быстрее и стабильнее).
REM - ExecutionPolicy Bypass: обойти ограничения политики только для этого запуска.
REM Логика PowerShell:
REM 1) Проверить существование исходной папки.
REM 2) Взять только вложенные папки и их имена.
REM 3) Отсортировать имена и сохранить в UTF-8 в выходной TXT.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$src = '%SOURCE_DIR%';" ^
  "$out = '%OUT_FILE%';" ^
  "if (-not (Test-Path -LiteralPath $src)) {" ^
  "  Write-Host ('Папка не найдена: ' + $src);" ^
  "  exit 1" ^
  "}" ^
  "Get-ChildItem -LiteralPath $src -Directory | Select-Object -ExpandProperty Name | Sort-Object | Set-Content -LiteralPath $out -Encoding UTF8;" ^
  "Write-Host ('Готово. Файл сохранен: ' + $out)"

if errorlevel 1 (
  REM Если предыдущая команда завершилась ошибкой (код >= 1), обрабатываем ошибку.
  echo Ошибка выполнения скрипта.
  REM Сообщаем об ошибке.
  pause
  REM Держим окно открытым, чтобы успеть прочитать текст.
  exit /b 1
  REM Завершаем .bat с кодом ошибки.
)

echo.
REM Пустая строка для удобства чтения вывода.
echo Нажмите любую клавишу для выхода...
REM Подсказка пользователю перед закрытием окна.
pause >nul
REM Ждем нажатия клавиши (без служебного текста команды pause).
exit /b 0
REM Корректное завершение .bat со статусом "успех".
