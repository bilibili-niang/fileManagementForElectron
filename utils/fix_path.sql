USE superutils_file_manager;

-- 删除路径为 E: 或 E:\ 的文件（这些是错误的根目录文件）
DELETE FROM files 
WHERE path = 'E:' OR path = 'E:\\';

-- 查看删除后的结果
SELECT COUNT(*) as remaining_files FROM files WHERE path LIKE 'E:%';
