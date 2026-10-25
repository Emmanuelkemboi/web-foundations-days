
# School Database Design

## Tables

**Students:** Stores each student's unique ID, name and email address. The email is required and must be unique.

**Courses:** Stores each course's unique ID and course name. Each course must have a name.

**Enrolments:** Connects students to courses and stores their grades. Each enrolment references an existing student and course through foreign keys.

## Relationships

Students and enrolments have a one-to-many relationship because one student can enrol in several courses, while each enrolment belongs to one student.

Courses and enrolments also have a one-to-many relationship because one course can have many enrolments, while each enrolment belongs to one course.

Students and courses have a many-to-many relationship because a student can take multiple courses and a course can have multiple students. The enrolments table acts as a join table connecting these two tables and storing additional information such as grades. A unique constraint on the student and course IDs prevents duplicate enrolments.

## Index

I would add an index on `enrolments(course_id)` to improve searches that retrieve students enrolled in a particular course and queries that count enrolments per course. This index helps the database locate matching enrolment records more efficiently.

## SQL or NoSQL?

I would choose a relational SQL database such as SQLite for this school system. The data is structured, and students, courses and enrolments have clear relationships. SQL supports joins, counting enrolments and updating grades, while primary keys, foreign keys and unique constraints help maintain data integrity. NoSQL could be useful for flexible or unstructured data, but SQL is more suitable for this system's structured records and relationships.
