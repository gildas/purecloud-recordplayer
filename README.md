# purecloud-recordplayer
Simple example showing how to access recordings in a web page

# Docker

```sh
docker build --tag recordplayer .
```

```sh
docker run -p 3000:5000 --name recordplayer -v $(pwd):/usr/local/src --sig-proxy=false recordplayer nf start
