cd js-api
cmd /c npm install
cmd /c npm link
cd ..
forfiles /P libraries /C "cmd /c cd @file & npm install"
forfiles /P libraries /C "cmd /c cd @file & npm link"
forfiles /P libraries /C "cmd /c cd @file & npm run link-all"
