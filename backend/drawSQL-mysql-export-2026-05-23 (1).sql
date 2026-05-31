CREATE TABLE `users`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `role` LINESTRING NOT NULL,
    `email` MULTILINESTRING NOT NULL,
    `name` LINESTRING NOT NULL
);
CREATE TABLE `classes`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `users_id` BIGINT NOT NULL,
    `name` LINESTRING NOT NULL,
    `year` SMALLINT NOT NULL
);
CREATE TABLE `students`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` LINESTRING NOT NULL,
    `student_code` BIGINT NOT NULL,
    `class_id` BIGINT NOT NULL
);
CREATE TABLE `rubrics`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `title` LINESTRING NOT NULL,
    `content` JSON NOT NULL,
    `assignment_id` BIGINT NOT NULL
);
CREATE TABLE `assignments`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `deadline` DATETIME NOT NULL,
    `problem_text` TEXT NOT NULL,
    `type` LINESTRING NOT NULL,
    `user_id` BIGINT NOT NULL
);
CREATE TABLE `submissions`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `student_id` BIGINT NOT NULL,
    `rubric_id` BIGINT NOT NULL,
    `image_url` LINESTRING NOT NULL,
    `ocr_text` TEXT NOT NULL
);
CREATE TABLE `results`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `submission_id` BIGINT NOT NULL,
    `steps_json` JSON NOT NULL,
    `total_score` INT NOT NULL,
    `confidence` FLOAT(53) NOT NULL
);
CREATE TABLE `teacher_feedback`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `result_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `final_score` FLOAT(53) NOT NULL,
    `note` TEXT NOT NULL
);
CREATE TABLE `classes_assignments`(
    `assignment_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `class_id` BIGINT NOT NULL,
    PRIMARY KEY(`class_id`)
);
ALTER TABLE
    `submissions` ADD CONSTRAINT `submissions_student_id_foreign` FOREIGN KEY(`student_id`) REFERENCES `students`(`id`);
ALTER TABLE
    `rubrics` ADD CONSTRAINT `rubrics_assignment_id_foreign` FOREIGN KEY(`assignment_id`) REFERENCES `assignments`(`id`);
ALTER TABLE
    `classes` ADD CONSTRAINT `classes_users_id_foreign` FOREIGN KEY(`users_id`) REFERENCES `users`(`id`);
ALTER TABLE
    `classes_assignments` ADD CONSTRAINT `classes_assignments_assignment_id_foreign` FOREIGN KEY(`assignment_id`) REFERENCES `assignments`(`id`);
ALTER TABLE
    `assignments` ADD CONSTRAINT `assignments_user_id_foreign` FOREIGN KEY(`user_id`) REFERENCES `users`(`id`);
ALTER TABLE
    `teacher_feedback` ADD CONSTRAINT `teacher_feedback_user_id_foreign` FOREIGN KEY(`user_id`) REFERENCES `users`(`id`);
ALTER TABLE
    `classes_assignments` ADD CONSTRAINT `classes_assignments_class_id_foreign` FOREIGN KEY(`class_id`) REFERENCES `classes`(`id`);
ALTER TABLE
    `submissions` ADD CONSTRAINT `submissions_rubric_id_foreign` FOREIGN KEY(`rubric_id`) REFERENCES `rubrics`(`id`);
ALTER TABLE
    `results` ADD CONSTRAINT `results_submission_id_foreign` FOREIGN KEY(`submission_id`) REFERENCES `submissions`(`id`);
ALTER TABLE
    `teacher_feedback` ADD CONSTRAINT `teacher_feedback_result_id_foreign` FOREIGN KEY(`result_id`) REFERENCES `results`(`id`);
ALTER TABLE
    `students` ADD CONSTRAINT `students_class_id_foreign` FOREIGN KEY(`class_id`) REFERENCES `classes`(`id`);