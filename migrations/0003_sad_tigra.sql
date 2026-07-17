PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ai_chat_message` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`role` text NOT NULL,
	`parts` text NOT NULL,
	`metadata` text,
	`status` text DEFAULT 'ready' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `ai_chat`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_ai_chat_message`("id", "chat_id", "role", "parts", "metadata", "status", "created_at", "updated_at") SELECT "id", "chat_id", "role", "parts", "metadata", "status", "created_at", "updated_at" FROM `ai_chat_message`;--> statement-breakpoint
DROP TABLE `ai_chat_message`;--> statement-breakpoint
ALTER TABLE `__new_ai_chat_message` RENAME TO `ai_chat_message`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `ai_chat_message_chat_created_idx` ON `ai_chat_message` (`chat_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_chat_message_role_idx` ON `ai_chat_message` (`role`);