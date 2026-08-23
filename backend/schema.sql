-- YDCS Radio Home Management System - Database Schema
-- Generated 2026-08-10T15:09:02.926Z
-- Database: ydcs_radio_home

DROP TABLE IF EXISTS `audit_logs`;

CREATE TABLE `audit_logs` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `action` varchar(100) NOT NULL,
  `entity` varchar(100) NOT NULL,
  `entity_id` varchar(36) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `country_code` varchar(2) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT '2026-07-30 20:36:27',
  PRIMARY KEY (`id`),
  KEY `al_user_idx` (`user_id`),
  KEY `al_action_idx` (`action`),
  KEY `al_entity_idx` (`entity`),
  KEY `al_created_idx` (`created_at`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci

DROP TABLE IF EXISTS `churches`;

CREATE TABLE `churches` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `region_id` varchar(36) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT '2026-07-30 20:36:27',
  `updated_at` datetime NOT NULL DEFAULT '2026-07-30 20:36:27',
  PRIMARY KEY (`id`),
  KEY `church_region_idx` (`region_id`),
  CONSTRAINT `fk_churches_region` FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci

DROP TABLE IF EXISTS `languages`;

CREATE TABLE `languages` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT '2026-07-30 20:36:27',
  PRIMARY KEY (`id`),
  UNIQUE KEY `languages_name_unique` (`name`),
  UNIQUE KEY `lang_name_idx` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci

DROP TABLE IF EXISTS `media`;

CREATE TABLE `media` (
  `id` varchar(36) NOT NULL,
  `group_id` varchar(36) DEFAULT NULL,
  `type` enum('photo','video','youtube') NOT NULL,
  `url` varchar(500) NOT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `date_taken` datetime DEFAULT NULL,
  `created_by` varchar(36) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT '2026-07-30 20:36:27',
  PRIMARY KEY (`id`),
  KEY `media_group_idx` (`group_id`),
  KEY `media_type_idx` (`type`),
  KEY `fk_media_creator` (`created_by`),
  CONSTRAINT `fk_media_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_media_group` FOREIGN KEY (`group_id`) REFERENCES `radio_home_groups` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci

DROP TABLE IF EXISTS `radio_home_groups`;

CREATE TABLE `radio_home_groups` (
  `id` varchar(36) NOT NULL,
  `serial_number` varchar(20) NOT NULL,
  `date_started` datetime DEFAULT NULL,
  `region_id` varchar(36) DEFAULT NULL,
  `language_id` varchar(36) DEFAULT NULL,
  `church_id` varchar(36) DEFAULT NULL,
  `group_leader_name` varchar(255) DEFAULT NULL,
  `group_leader_phone` varchar(20) DEFAULT NULL,
  `facilitator_name` varchar(255) DEFAULT NULL,
  `facilitator_phone` varchar(20) DEFAULT NULL,
  `male_members` int(11) NOT NULL DEFAULT 0,
  `female_members` int(11) NOT NULL DEFAULT 0,
  `total_members` int(11) NOT NULL DEFAULT 0,
  `radio_given` int(11) NOT NULL DEFAULT 0,
  `agreement_made` int(11) NOT NULL DEFAULT 0,
  `testimony_url` varchar(500) DEFAULT NULL,
  `remark` text DEFAULT NULL,
  `status` enum('active','inactive','closed') NOT NULL DEFAULT 'active',
  `created_by` varchar(36) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT '2026-07-30 20:36:27',
  `updated_at` datetime NOT NULL DEFAULT '2026-07-30 20:36:27',
  `video_url` varchar(500) DEFAULT NULL,
  `video_description` text DEFAULT NULL,
  `regional_state_id` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `radio_home_groups_serial_number_unique` (`serial_number`),
  UNIQUE KEY `rhg_serial_idx` (`serial_number`),
  KEY `rhg_region_idx` (`region_id`),
  KEY `rhg_language_idx` (`language_id`),
  KEY `rhg_church_idx` (`church_id`),
  KEY `rhg_date_idx` (`date_started`),
  KEY `rhg_status_idx` (`status`),
  KEY `rhg_leader_idx` (`group_leader_name`),
  KEY `rhg_facilitator_idx` (`facilitator_name`),
  KEY `fk_rhg_creator` (`created_by`),
  KEY `rhg_regional_state_idx` (`regional_state_id`),
  CONSTRAINT `fk_rhg_church` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`),
  CONSTRAINT `fk_rhg_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_rhg_language` FOREIGN KEY (`language_id`) REFERENCES `languages` (`id`),
  CONSTRAINT `fk_rhg_region` FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci

DROP TABLE IF EXISTS `refresh_tokens`;

CREATE TABLE `refresh_tokens` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `token` varchar(500) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT '2026-07-30 20:36:27',
  PRIMARY KEY (`id`),
  UNIQUE KEY `rt_token_idx` (`token`),
  KEY `rt_user_id_idx` (`user_id`),
  CONSTRAINT `fk_refresh_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci

DROP TABLE IF EXISTS `regional_states`;

CREATE TABLE `regional_states` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(10) NOT NULL,
  `default_language` varchar(255) NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT '2026-07-30 20:36:27',
  `updated_at` datetime NOT NULL DEFAULT '2026-07-30 20:36:27',
  PRIMARY KEY (`id`),
  UNIQUE KEY `regional_states_name_unique` (`name`),
  UNIQUE KEY `regional_states_code_unique` (`code`),
  UNIQUE KEY `rs_code_idx` (`code`),
  UNIQUE KEY `rs_name_idx` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci

DROP TABLE IF EXISTS `regions`;

CREATE TABLE `regions` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `regional_state_id` varchar(36) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT '2026-07-30 20:36:27',
  `updated_at` datetime NOT NULL DEFAULT '2026-07-30 20:36:27',
  PRIMARY KEY (`id`),
  KEY `region_rs_idx` (`regional_state_id`),
  KEY `region_name_idx` (`name`),
  CONSTRAINT `fk_regions_state` FOREIGN KEY (`regional_state_id`) REFERENCES `regional_states` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci

DROP TABLE IF EXISTS `reports`;

CREATE TABLE `reports` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_size` int(11) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `created_by` varchar(36) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `reports_created_idx` (`created_at`),
  KEY `fk_reports_creator` (`created_by`),
  CONSTRAINT `fk_reports_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci

DROP TABLE IF EXISTS `serial_sequences`;

CREATE TABLE `serial_sequences` (
  `id` varchar(36) NOT NULL,
  `region_code` varchar(10) NOT NULL,
  `last_number` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `serial_sequences_region_code_unique` (`region_code`),
  UNIQUE KEY `seq_region_code_idx` (`region_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `username` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','data_entry','viewer','radio_assistant') NOT NULL DEFAULT 'viewer',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT '2026-07-30 20:36:27',
  `updated_at` datetime NOT NULL DEFAULT '2026-07-30 20:36:27',
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_unique` (`username`),
  UNIQUE KEY `username_idx` (`username`),
  KEY `role_idx` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci

