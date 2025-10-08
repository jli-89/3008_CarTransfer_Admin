-- MySQL dump 10.13  Distrib 8.0.38, for Win64 (x86_64)
--
-- Host: localhost    Database: car_transport_quote
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
-- Table structure for table `locations`
--

DROP TABLE IF EXISTS `locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `locations` (
  `location_id` int unsigned NOT NULL AUTO_INCREMENT,
  `city_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `state_code` char(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `postcode` char(4) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`location_id`),
  UNIQUE KEY `uq_city_state` (`city_name`,`state_code`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `locations`
--

LOCK TABLES `locations` WRITE;
/*!40000 ALTER TABLE `locations` DISABLE KEYS */;
INSERT INTO `locations` VALUES (1,'Sydney','NSW','2000'),(2,'Melbourne','VIC','3000'),(3,'Brisbane','QLD','4000'),(4,'Gold Coast','QLD','4217'),(5,'Sunshine Coast','QLD','4551'),(6,'Cairns','QLD','4870'),(7,'Perth','WA','6000'),(8,'Wollongong','NSW','2500'),(9,'Adelaide','SA','5000');
/*!40000 ALTER TABLE `locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `route_prices`
--

DROP TABLE IF EXISTS `route_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `route_prices` (
  `price_id` int unsigned NOT NULL AUTO_INCREMENT,
  `pickup_id` int unsigned NOT NULL,
  `delivery_id` int unsigned NOT NULL,
  `vehicle_type_id` int unsigned NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `transit_days` tinyint DEFAULT NULL,
  `is_backload` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Backload (discounted return trip): 1 = yes, 0 = no',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`price_id`),
  UNIQUE KEY `uq_route` (`pickup_id`,`delivery_id`,`vehicle_type_id`),
  KEY `fk_route_delivery` (`delivery_id`),
  KEY `fk_route_vehicle` (`vehicle_type_id`),
  CONSTRAINT `fk_route_delivery` FOREIGN KEY (`delivery_id`) REFERENCES `locations` (`location_id`),
  CONSTRAINT `fk_route_pickup` FOREIGN KEY (`pickup_id`) REFERENCES `locations` (`location_id`),
  CONSTRAINT `fk_route_vehicle` FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_types` (`vehicle_type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `route_prices`
--

LOCK TABLES `route_prices` WRITE;
/*!40000 ALTER TABLE `route_prices` DISABLE KEYS */;
INSERT INTO `route_prices` VALUES (1,1,2,1,99.00,3,0,'2025-08-14 11:46:26'),(2,1,2,2,1050.00,3,0,'2025-08-14 11:46:26'),(3,1,2,3,900.00,5,1,'2025-08-14 11:46:26'),(4,1,3,1,850.00,2,0,'2025-08-14 11:46:37'),(5,1,3,2,9980.00,2,0,'2025-08-14 11:46:37'),(6,1,3,3,1000.00,2,0,'2025-08-14 11:46:37'),(7,1,4,1,735.00,2,0,'2025-08-14 11:46:49'),(8,1,4,2,840.00,2,0,'2025-08-14 11:46:49'),(9,1,4,3,900.00,2,0,'2025-08-14 11:46:49'),(10,1,5,1,790.00,2,0,'2025-08-14 11:47:01'),(11,1,5,2,880.00,2,0,'2025-08-14 11:47:01'),(12,1,5,3,940.00,2,0,'2025-08-14 11:47:01'),(13,2,3,1,1060.00,3,0,'2025-08-14 11:47:08'),(14,2,3,2,1160.00,3,0,'2025-08-14 11:47:08'),(15,2,3,3,1210.00,3,0,'2025-08-14 11:47:08'),(16,4,1,1,755.00,2,0,'2025-08-14 11:48:23'),(17,4,1,2,870.00,2,0,'2025-08-14 11:48:23'),(18,4,1,3,925.00,2,0,'2025-08-14 11:48:23');
/*!40000 ALTER TABLE `route_prices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicle_types`
--

DROP TABLE IF EXISTS `vehicle_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_types` (
  `vehicle_type_id` int unsigned NOT NULL AUTO_INCREMENT,
  `type_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`vehicle_type_id`),
  UNIQUE KEY `uq_type_code` (`type_code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicle_types`
--

LOCK TABLES `vehicle_types` WRITE;
/*!40000 ALTER TABLE `vehicle_types` DISABLE KEYS */;
INSERT INTO `vehicle_types` VALUES (1,'sedan','Sedan – standard passenger car'),(2,'suv','SUV – Sports Utility Vehicle'),(3,'ute','Ute – utility / pick-up'),(4,'motorcycle','Two-wheeled motorcycle or scooter.'),(5,'other','Please contact customer service.');
/*!40000 ALTER TABLE `vehicle_types` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-08 12:59:43
