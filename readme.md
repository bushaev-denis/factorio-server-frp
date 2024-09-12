# Factorio server with reverse proxy [FRP](https://github.com/fatedier/frp)

> This approach means you have static IP on your host machine (where you run factorio server)

## How to run

### Preparation

> all command-blocks means you run it from the root of project

```shell
cd cdk
cp .env.development .env
```

> fill up cdk/.env file with secrets

### Deploy reverse proxy stack to the AWS

```shell
export AWS_ACCESS_ID={your_aws_access_id_here}
export AWS_ACCESS_KEY={your_aws_access_key_here}

cd cdk
npm i
# uncomment next line if `cdk deploy` will be swears at you about bootstrapping
# npm run cdk bootstrap
npm run cdk deploy
```

> previous command shows your ec2 server instance IP in the output message, copy it and paste to the `serverAddr` in the `frpc.toml` file in the root of the project

### Run server

```shell
docker compose up -d
```

### Run factorio and check if your reverse server public IP is accessible to connect
