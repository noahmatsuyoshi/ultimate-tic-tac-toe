eb init ultimate-tic-tac-toe-app -p Docker -r us-west-2 --keyname=nmatsuyoshi-us-west-2
eb create ultimate-tic-tac-toe-env --elb-type application --envvar AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID --envvar AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY