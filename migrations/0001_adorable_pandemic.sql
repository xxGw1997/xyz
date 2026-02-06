CREATE TABLE `message` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`content` text,
	`type` text DEFAULT 'text' NOT NULL,
	`reply_to_id` text,
	`metadata` text,
	`is_edited` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `message_room_created_idx` ON `message` (`room_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `message_sender_idx` ON `message` (`sender_id`);--> statement-breakpoint
CREATE INDEX `message_reply_idx` ON `message` (`reply_to_id`);--> statement-breakpoint
CREATE TABLE `room` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text DEFAULT 'group' NOT NULL,
	`name` text,
	`description` text,
	`avatar` text,
	`is_public` integer DEFAULT false NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`last_message_at` integer,
	`last_message_id` text,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `room_member` (
	`room_id` text NOT NULL,
	`user_id` text NOT NULL,
	`joined_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`muted_until` integer,
	PRIMARY KEY(`room_id`, `user_id`),
	FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `room_member_user_idx` ON `room_member` (`user_id`);