# Присваиваем переменной последнюю версию папки, содержащей "mac"
last_version=$(ls ~/.cache/puppeteer/chrome | grep mac | sort -V | tail -n 1)

# Выводим значение переменной для проверки
echo "Последняя версия: $last_version"
