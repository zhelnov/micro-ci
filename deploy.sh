echo "Deploying service $3 from directory $1 from branch $2"
cd ~/dev/$1
git fetch
git reset --hard origin/$2
docker-compose up -d --build $3
