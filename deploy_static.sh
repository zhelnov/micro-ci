echo "Deploying static service from directory $1 from branch $2"
cd ~/dev/$1
git fetch
git reset --hard origin/$2
export PATH="$PATH:/home/web/.nvm/versions/node/v16.20.2/bin"
npm ci
npm run build
rm -rf /usr/share/nginx/html/$1/*
mv dist/* /usr/share/nginx/html/$1/ 
