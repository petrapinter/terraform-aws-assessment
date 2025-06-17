# Apex Infra Homework

## Description

This repository contains the code for the Apex Infra Homework, which is a media sharing platform built using TypeScript, React, and Hono. Your task will be to create IaC to deploy this application to AWS. You can start the app locally, using the startup.sh script. The application uses [MinIO](https://min.io/docs/minio/linux/index.html) as a storage backend, which is a drop-in replacement of S3, with S3 compatible client as well, and a Postgres database for the application data. The application allows uploading images and videos, with an uploader name and description. And it also allows commenting on uploaded content by specifying an author and a comment field.

### Tasks

* Create IaC in terraform to deploy the application to AWS
* Ensure that the application is deployed with AWS best practices in mind.
* Code changes are out of scope, the developers have not followed best practices during development, thus any alteration could lead to a problematic deployment.
* Focus on analyzing the Dockerfiles, Composefile and the provided build scripts to understand the application, along with any other non-source code files.
* It is encouraged to replace services with AWS native alternatives, wherever feasible.
* Provide a diagram of the final infrastructure.

### Notes

* Customer team has already made preparations for deploying on AWS. If you do not specify blob storage credentials,
the backend will try to retrieve them from the ECS task metadata endpoint.

### Architecture

The customer provided you with the following architectural diagram.

```mermaid

C4Context
    title MediaShare architecture

    Person(user, "User")
    
    Enterprise_Boundary(media_share, "MediaShare"){
    System(blob_storage, "MinIO server")
    System(web, "MediaShare Web")
    SystemDb(db, "Postgres Database")
    System(api, "MediaShare API")
    }

Rel(user, web, "GET /index.html")
Rel(user, api, "API operations")
Rel(web, blob_storage, "serve static content")
Rel(api, db, "Database operations")

```

## Workflows:

### File upload:

```mermaid
sequenceDiagram
    participant User
    participant Web
    participant API
    participant BlobStorage
    participant DB

    User->>API: POST /api/upload-url
    API->>BlobStorage: GET presigned URL
    API->>DB: Insert media item
    BlobStorage-->>API: create presigned URL
    API-->>User: return presigned URL
    User->>BlobStorage: PUT file
    BlobStorage-->>User: 201 Created
```

### Visit

```mermaid
sequenceDiagram
    participant User
    participant Web
    participant API
    participant BlobStorage

    User->>Web: GET /index.html
    Web->>User: index.html
    User->>API: GET /api/media
    API->>User: media list
    User ->> Web: GET /media/{id}
    Web ->> BlobStorage: ProxyPass
    BlobStorage-->>User: files
```

### Comment

```mermaid
sequenceDiagram
    participant User
    participant Web
    participant API
    participant DB

    User->>Web: GET /index.html
    Web->>User: index.html
    User->>API: GET /api/media
    API->>User: media list
    User ->> Web: GET /media/{id}
    Web ->> API: GET /api/media/{id}
    API->>DB: Select media item
    DB-->>API: media item
    API-->>User: media item
    User ->> API: POST /api/media/{id}/comments
    API->>DB: Insert comment
```
