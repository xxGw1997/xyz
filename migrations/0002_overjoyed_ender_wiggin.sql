CREATE TABLE `ai_chat` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text,
	`model` text NOT NULL,
	`system_prompt` text,
	`status` text DEFAULT 'active' NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`last_message_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_chat_user_idx` ON `ai_chat` (`user_id`);--> statement-breakpoint
CREATE INDEX `ai_chat_user_status_updated_idx` ON `ai_chat` (`user_id`,`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `ai_chat_last_message_idx` ON `ai_chat` (`last_message_at`);--> statement-breakpoint
CREATE TABLE `ai_chat_generation` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`user_message_id` text,
	`assistant_message_id` text,
	`model` text NOT NULL,
	`status` text NOT NULL,
	`prompt_tokens` integer,
	`completion_tokens` integer,
	`total_tokens` integer,
	`finish_reason` text,
	`error_message` text,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `ai_chat`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_message_id`) REFERENCES `ai_chat_message`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`assistant_message_id`) REFERENCES `ai_chat_message`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ai_chat_generation_chat_idx` ON `ai_chat_generation` (`chat_id`);--> statement-breakpoint
CREATE INDEX `ai_chat_generation_status_idx` ON `ai_chat_generation` (`status`);--> statement-breakpoint
CREATE INDEX `ai_chat_generation_user_message_idx` ON `ai_chat_generation` (`user_message_id`);--> statement-breakpoint
CREATE TABLE `ai_chat_message` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`user_id` text,
	`role` text NOT NULL,
	`parts` text NOT NULL,
	`metadata` text,
	`status` text DEFAULT 'ready' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `ai_chat`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ai_chat_message_chat_created_idx` ON `ai_chat_message` (`chat_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_chat_message_user_idx` ON `ai_chat_message` (`user_id`);--> statement-breakpoint
CREATE INDEX `ai_chat_message_role_idx` ON `ai_chat_message` (`role`);