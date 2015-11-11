cd ../website && git add -A && git commit -m '[autopublish]' && git push origin master
cd ../server/website && git pull
cd .. && git add -A && git commit -m '[autopublish]' && git push origin master && git push heroku master