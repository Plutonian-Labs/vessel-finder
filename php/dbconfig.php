<?php
/**
 * Legacy MySQL connection.
 *
 * Supply connection settings through server environment variables.
 * Never commit passwords or production configuration to Git.
 */
$servername = getenv('VESSEL_DB_HOST') ?: '127.0.0.1';
$username = getenv('VESSEL_DB_USER');
$password = getenv('VESSEL_DB_PASSWORD');
$dbname = getenv('VESSEL_DB_NAME');
$port = filter_var(getenv('VESSEL_DB_PORT') ?: '3306', FILTER_VALIDATE_INT);

if ($username === false || $password === false || $dbname === false || $port === false) {
    error_log('Vessel Finder: missing or invalid database environment configuration.');
    http_response_code(503);
    exit('Database configuration unavailable.');
}

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
try {
    $conn = new mysqli($servername, $username, $password, $dbname, $port);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $error) {
    error_log('Vessel Finder: database connection failed.');
    http_response_code(503);
    exit('Database connection unavailable.');
}
