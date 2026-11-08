CREATE TABLE `decisions` (
	`task` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`note` text NOT NULL,
	`changed` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`checked` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `repository` (
	`key` text PRIMARY KEY NOT NULL,
	`fetched` text NOT NULL,
	`data` text NOT NULL
);
