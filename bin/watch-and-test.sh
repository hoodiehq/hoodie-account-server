clear

if [[ $1 =~ -test.js$ ]]; then
  tap -b $(node -e 'process.stdout.write(process.argv[1].replace(process.cwd() + "/", ""))' $1)
else
  # tap -b tests/**/*-test.js
  tap -b tests/integration/account-test.js
fi
