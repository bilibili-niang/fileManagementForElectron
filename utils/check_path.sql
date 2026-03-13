USE superutils_file_manager;

-- 查看所有路径为 E: 或 E:\ 的文件
SELECT name, path, CONCAT(path, '\\', name) as full_path 
FROM files 
WHERE path LIKE 'E:%' 
ORDER BY name 
LIMIT 20;
