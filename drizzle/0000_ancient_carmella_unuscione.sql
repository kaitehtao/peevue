CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`name` text NOT NULL,
	`rating` integer NOT NULL,
	`body` text NOT NULL,
	`visited` text NOT NULL,
	`created_at` text NOT NULL,
	`photos` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_created_at` ON `reviews` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_reviews_venue_id` ON `reviews` (`venue_id`);