-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Sep 16, 2025 at 05:02 PM
-- Server version: 5.7.44-cll-lve
-- PHP Version: 8.1.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `jli89_car_transport_quotes`
--

-- --------------------------------------------------------

--
-- Table structure for table `locations`
--

CREATE TABLE `locations` (
  `location_id` int(10) UNSIGNED NOT NULL,
  `city_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `state_code` char(3) COLLATE utf8mb4_unicode_ci NOT NULL,
  `postcode` char(4) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `locations`
--

INSERT INTO `locations` (`location_id`, `city_name`, `state_code`, `postcode`) VALUES
(1, 'Sydney', 'NSW', '2000'),
(2, 'Melbourne', 'VIC', '3000'),
(3, 'Brisbane', 'QLD', '4000'),
(4, 'Gold Coast', 'QLD', '4217'),
(5, 'Sunshine Coast', 'QLD', '4551'),
(6, 'Cairns', 'QLD', '4870');

-- --------------------------------------------------------

--
-- Table structure for table `route_prices`
--

CREATE TABLE `route_prices` (
  `price_id` int(10) UNSIGNED NOT NULL,
  `pickup_id` int(10) UNSIGNED NOT NULL,
  `delivery_id` int(10) UNSIGNED NOT NULL,
  `vehicle_type_id` int(10) UNSIGNED NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `transit_days` tinyint(4) DEFAULT NULL,
  `is_backload` tinyint(1) DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `route_prices`
--

INSERT INTO `route_prices` (`price_id`, `pickup_id`, `delivery_id`, `vehicle_type_id`, `price`, `transit_days`, `is_backload`, `created_at`) VALUES
(1, 1, 2, 1, 950.00, 3, 0, '2025-08-14 11:46:26'),
(2, 1, 2, 2, 1050.00, 3, 0, '2025-08-14 11:46:26'),
(3, 1, 2, 3, 1100.00, 3, 0, '2025-08-14 11:46:26'),
(4, 1, 3, 1, 850.00, 2, 0, '2025-08-14 11:46:37'),
(5, 1, 3, 2, 950.00, 2, 0, '2025-08-14 11:46:37'),
(6, 1, 3, 3, 1000.00, 2, 0, '2025-08-14 11:46:37'),
(7, 1, 4, 1, 735.00, 2, 0, '2025-08-14 11:46:49'),
(8, 1, 4, 2, 840.00, 2, 0, '2025-08-14 11:46:49'),
(9, 1, 4, 3, 900.00, 2, 0, '2025-08-14 11:46:49'),
(10, 1, 5, 1, 790.00, 2, 0, '2025-08-14 11:47:01'),
(11, 1, 5, 2, 880.00, 2, 0, '2025-08-14 11:47:01'),
(12, 1, 5, 3, 940.00, 2, 0, '2025-08-14 11:47:01'),
(13, 2, 3, 1, 1060.00, 3, 0, '2025-08-14 11:47:08'),
(14, 2, 3, 2, 1160.00, 3, 0, '2025-08-14 11:47:08'),
(15, 2, 3, 3, 1210.00, 3, 0, '2025-08-14 11:47:08'),
(16, 4, 1, 1, 755.00, 2, 0, '2025-08-14 11:48:23'),
(17, 4, 1, 2, 870.00, 2, 0, '2025-08-14 11:48:23'),
(18, 4, 1, 3, 925.00, 2, 0, '2025-08-14 11:48:23');

-- --------------------------------------------------------

--
-- Table structure for table `vehicle_types`
--

CREATE TABLE `vehicle_types` (
  `vehicle_type_id` int(10) UNSIGNED NOT NULL,
  `type_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `vehicle_types`
--

INSERT INTO `vehicle_types` (`vehicle_type_id`, `type_code`, `description`) VALUES
(1, 'sedan', 'Sedan – standard passenger car'),
(2, 'suv', 'SUV – Sports Utility Vehicle'),
(3, 'ute', 'Ute – utility / pick-up');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `locations`
--
ALTER TABLE `locations`
  ADD PRIMARY KEY (`location_id`),
  ADD UNIQUE KEY `uq_city_state` (`city_name`,`state_code`);

--
-- Indexes for table `route_prices`
--
ALTER TABLE `route_prices`
  ADD PRIMARY KEY (`price_id`),
  ADD UNIQUE KEY `uq_route` (`pickup_id`,`delivery_id`,`vehicle_type_id`),
  ADD KEY `fk_route_delivery` (`delivery_id`),
  ADD KEY `fk_route_vehicle` (`vehicle_type_id`);

--
-- Indexes for table `vehicle_types`
--
ALTER TABLE `vehicle_types`
  ADD PRIMARY KEY (`vehicle_type_id`),
  ADD UNIQUE KEY `uq_type_code` (`type_code`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `locations`
--
ALTER TABLE `locations`
  MODIFY `location_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `route_prices`
--
ALTER TABLE `route_prices`
  MODIFY `price_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `vehicle_types`
--
ALTER TABLE `vehicle_types`
  MODIFY `vehicle_type_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `route_prices`
--
ALTER TABLE `route_prices`
  ADD CONSTRAINT `fk_route_delivery` FOREIGN KEY (`delivery_id`) REFERENCES `locations` (`location_id`),
  ADD CONSTRAINT `fk_route_pickup` FOREIGN KEY (`pickup_id`) REFERENCES `locations` (`location_id`),
  ADD CONSTRAINT `fk_route_vehicle` FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_types` (`vehicle_type_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
