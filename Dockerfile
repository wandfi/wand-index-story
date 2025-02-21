# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 as base
WORKDIR /usr/src/app

# install with --production (exclude devDependencies)
COPY . .
RUN bun install --frozen-lockfile --production

# [optional] tests & build
ENV NODE_ENV=production

# copy production dependencies and source code into final image
FROM base AS release
# run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "start"]