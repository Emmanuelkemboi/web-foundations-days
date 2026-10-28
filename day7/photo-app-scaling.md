# SnapShare: Scaling Plan

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos and view a feed of photos shared by people they follow.

The following assumptions are used for the estimates:

- Registered users: 10,000,000.
- Daily active users (DAU): 10% of registered users.
- Each active user uploads one photo per day.
- Each active user views 50 feed pages per day.
- Average original photo size: 2 MB.
- Each original photo has one 50 KB thumbnail.
- One day has 86,400 seconds, and one year has 365 days.
- Traffic is averaged across the entire day. Peak feed traffic is estimated at five times the average.
- Storage estimates use decimal units: 1 TB = 1,000,000 MB.
- Photos and thumbnails are retained for one year, with no deletion or compression savings included.

### Daily active users

Daily active users are calculated as:

10,000,000 × 10% = **1,000,000 daily active users**

Therefore, SnapShare serves approximately one million active users each day.

## 2. Traffic and Storage Estimates

### Uploads per second

Each daily active user uploads one photo per day.

Daily uploads:

1,000,000 × 1 = 1,000,000 photos per day

Average uploads per second:

1,000,000 ÷ 86,400 = **11.57 uploads per second**

### Feed views per second

Each active user views 50 feed pages per day.

Daily feed views:

1,000,000 × 50 = 50,000,000 feed views per day

Average feed views per second:

50,000,000 ÷ 86,400 = **578.7 feed views per second**

Peak feed views per second:

578.7 × 5 = **2,893.5 feed views per second**

The system should therefore be designed to handle approximately 2,894 feed views per second at the estimated peak.

### Photo storage per year

Annual photo uploads:

1,000,000 × 365 = 365,000,000 photos per year

Original-photo storage:

365,000,000 × 2 MB = 730,000,000 MB = **730 TB per year**

Thumbnail storage:

365,000,000 × 50 KB = 18.25 TB per year

Total annual storage for originals and thumbnails:

730 TB + 18.25 TB = **748.25 TB per year**

These figures exclude database metadata, backups, replication, and additional storage overhead.

## 3. Is SnapShare Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system** because users view 50 feed pages per day but upload only one photo per day. Feed views significantly outnumber photo uploads.

This means the architecture should prioritize fast feed delivery, efficient caching, and the ability to scale read traffic horizontally. A CDN can deliver frequently accessed images closer to users, while a cache and database read replica can reduce the workload on the primary database.

The system must still handle substantial write traffic, especially when many users upload photos simultaneously.

## 4. Why Photos Should Not Be Stored in the Database

Original photos and thumbnails should be stored in object storage rather than directly inside the relational database.

Photos are large binary files, and storing hundreds of terabytes of image data in the database would increase storage costs, backups, replication overhead, and database workload. Large file storage could also compete with database operations that need to retrieve user profiles, follow relationships, and post metadata quickly.

Object storage is designed for durable, scalable storage of large files. The database should store metadata such as the photo ID, owner ID, caption, upload time, object-storage key, and thumbnail key. The actual image files remain in object storage and are delivered through the CDN.

## 5. Proposed Architecture

```text
                        USERS
                          |
                          v
                 +------------------+
                 |       CDN        |
                 | Cached images    |
                 +------------------+
                          |
                          v
                 +------------------+
                 |  Load Balancer   |
                 +------------------+
                          |
                          v
                 +------------------+
                 |   App Servers    |
                 | API and Feed     |
                 +------------------+
                    |      |      |
                    |      |      +-------------------+
                    |      |                          |
                    v      v                          v
             +-----------+  +----------------+  +----------------+
             |   Cache   |  | Primary        |  | Object Storage |
             | Feed data |  | Database       |  | Originals and  |
             | and data  |  |                |  | Thumbnails     |
             +-----------+  +----------------+  +----------------+
                                  |
                                  v
                           +----------------+
                           | Database Read  |
                           | Replica        |
                           +----------------+

                 PHOTO UPLOAD / THUMBNAIL PROCESSING

                 App Servers
                      |
                      v
                 +----------------+
                 | Upload Queue   |
                 +----------------+
                      |
                      v
                 +----------------+
                 | Thumbnail      |
                 | Worker         |
                 +----------------+
                      |
                      v
                 +----------------+
                 | Object Storage |
                 | Thumbnail File |
                 +----------------+
```

The diagram shows the major components and their relationships. In a production system, application servers would read from the cache and read replica where appropriate, and upload processing would use a reliable queue with retry handling.

## 6. What Each Component Does

- **CDN:** Caches and delivers photos and thumbnails from locations closer to users, reducing latency and object-storage requests.
- **Load balancer:** Distributes incoming API requests across healthy application servers to prevent one server from becoming overloaded.
- **Application servers:** Handle authentication, photo-upload requests, feed generation, metadata operations, and other application logic.
- **Cache:** Stores frequently requested feed data and metadata in fast memory to reduce repeated database queries.
- **Primary database:** Stores authoritative application data, including users, follow relationships, photo metadata, and upload records.
- **Database read replica:** Serves eligible read queries so that feed-related database reads place less pressure on the primary database.
- **Object storage:** Stores the original photo files and generated thumbnails durably without putting large image files inside the database.
- **Upload queue:** Holds thumbnail-generation jobs so that image processing can happen asynchronously instead of making users wait for it.
- **Thumbnail worker:** Processes queued jobs, generates smaller versions of uploaded photos, saves the thumbnails to object storage, and updates processing status when necessary.

## 7. Step-by-Step Photo Upload Flow

1. A user selects a photo and submits an upload request to SnapShare.
2. The application server authenticates the user and validates the request, including the file type, file size, and applicable upload limits.
3. The original photo is uploaded to object storage, using a unique object key.
4. The application records the photo metadata in the primary database, including the owner, object key, upload time, and processing status.
5. The application places a thumbnail-generation job on the upload queue.
6. The application returns an upload response to the user. The photo may appear in a pending-processing state until its thumbnail is ready.
7. A thumbnail worker retrieves the job from the queue and reads the original photo from object storage.
8. The worker generates a smaller 50 KB thumbnail, where feasible, and uploads it to object storage under a separate object key.
9. The worker updates the photo metadata to indicate that thumbnail processing is complete.
10. When other users view the feed, the application retrieves the relevant photo metadata, using the cache and read replica when appropriate. The CDN delivers cached image files, while uncached files can be fetched from object storage.
11. If a job fails, the queue can retry it, and failed jobs can be monitored for investigation.

This asynchronous design allows the upload request to finish without waiting for thumbnail processing, improving responsiveness and allowing workers to scale independently.

## 8. Design Trade-Offs

### Trade-Off 1: Caching Versus Freshness

Caching feed data and images reduces database load and improves response times. However, cached information can become stale when a user uploads a photo, changes a caption, or changes whom they follow.

SnapShare can use cache expiration and targeted invalidation to balance performance with freshness. Some feed updates may not appear immediately.

### Trade-Off 2: Asynchronous Processing Versus Immediate Availability

Using a queue and thumbnail workers keeps image processing outside the main upload request and allows processing capacity to scale independently. However, thumbnails may not be available immediately after an upload, and the system must handle retries, duplicate jobs, and failed processing.

The application should expose a processing status and make thumbnail jobs safe to retry.

### Trade-Off 3: Read Replicas Versus Strong Consistency

A database read replica can improve read capacity, but replication delay may cause recently uploaded photos or updated metadata to appear late when a feed is read from the replica.

SnapShare can send critical read-after-write operations to the primary database while using the replica for less time-sensitive feed queries.

### Trade-Off 4: Object Storage and CDN Versus Cost and Complexity

Object storage and a CDN scale well for large image files and reduce repeated origin requests. However, they introduce storage, bandwidth, cache-invalidation, access-control, and operational costs.

SnapShare should use suitable cache policies, private or signed access where needed, lifecycle rules, and monitoring to manage those costs and protect private photos.

## 9. Conclusion

SnapShare has approximately one million daily active users, 11.57 average photo uploads per second, 578.7 average feed views per second, and an estimated peak of 2,893.5 feed views per second.

The system is read-heavy, so its design should prioritize fast feed reads, caching, CDN delivery, and read scaling. Object storage should hold original photos and thumbnails, while the database stores metadata. A queue and thumbnail workers separate image processing from the upload request, allowing the application to scale its processing workload independently.

Based on the stated assumptions, SnapShare needs approximately 748.25 TB of additional storage per year for original photos and thumbnails alone.
