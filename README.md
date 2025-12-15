# Test App Portal

Internal Tool for sharing IPification Test Applications

## Build

Use standard Maven build to build the project. By default `frontend` and `docker` modules will be built.

```bash
mvn clean package
```

To build only `frontend` module use following command:

```bash
mvn -pl frontend clean package
```

## Run

### Using Docker Compose

```bash
# Navigate to docker directory
cd docker

# Start the container
docker-compose up

# Run in background
docker-compose up -d

# Stop the container
docker-compose down
```

The web interface will be available at: http://localhost:3009