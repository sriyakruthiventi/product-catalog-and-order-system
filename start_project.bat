@echo off
start "Java Server" powershell -NoExit -Command "cd 'D:\product_catalog_and _order system project\java'; & 'C:\Users\SRIYA KRUTHIVENTI\maven\apache-maven-3.9.16\bin\mvn.cmd' exec:java"
start "Python Forecast" powershell -NoExit -Command "cd 'D:\product_catalog_and _order system project\python'; python forecast_service.py"
start "Frontend" powershell -NoExit -Command "cd 'D:\product_catalog_and _order system project\frontend'; python -m http.server 5500"
timeout /t 5 /nobreak >nul
start http://localhost:5500
