-- MySQL dump 10.13  Distrib 8.0.38, for Win64 (x86_64)
--
-- Host: localhost    Database: car_transport_audit
-- ------------------------------------------------------
-- Server version	8.0.39

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `audit_id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `event_type` enum('LOGIN','ACCOUNT_ACTION') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '事件類型',
  `occurred_at` datetime(2) NOT NULL DEFAULT CURRENT_TIMESTAMP(2) COMMENT '事件時間 (0.01s)',
  `actor_user_id` bigint unsigned NOT NULL COMMENT '執行者',
  `target_user_id` bigint unsigned DEFAULT NULL COMMENT '被操作對象（帳號操作用）',
  `crud_operation` enum('CREATE','READ','UPDATE','DELETE') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'CRUD 類型（帳號操作用）',
  `action_description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '描述（可選）',
  `login_success` tinyint DEFAULT NULL COMMENT '登入是否成功（僅登入用：1/0）',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IPv4/IPv6',
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'UA',
  PRIMARY KEY (`audit_id`),
  KEY `idx_actor_time` (`actor_user_id`,`occurred_at`),
  KEY `idx_target_time` (`target_user_id`,`occurred_at`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_log`
--

LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
INSERT INTO `audit_log` VALUES (1,'ACCOUNT_ACTION','2025-10-06 10:06:42.35',1001,2003,'CREATE','admin created user',NULL,'203.0.113.10','Mozilla/5.0 Chrome/125'),(2,'LOGIN','2025-10-06 10:07:03.68',1002,NULL,NULL,NULL,0,'198.51.100.23','Mozilla/5.0 Safari/17'),(3,'ACCOUNT_ACTION','2025-10-06 10:07:25.81',1001,2002,'UPDATE','admin updated user email',NULL,'203.0.113.10','Mozilla/5.0 Chrome/125'),(4,'ACCOUNT_ACTION','2025-10-06 10:07:39.03',1001,2003,'CREATE','admin created user',NULL,'203.0.113.10','Mozilla/5.0 Chrome/125');
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-06 10:10:48
