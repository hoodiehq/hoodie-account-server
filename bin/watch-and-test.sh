clear

if [[ $1 =~ -test.js$ ]]; then
  tap "$1";
else
  tap tests;
fi
