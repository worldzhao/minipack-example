[窥探原理：手写一个 JavaScript 打包器](https://juejin.im/post/5e04c935e51d4557ea02c097)的学习记录

1. 解析文件内容及其依赖，首次为入口文件(babel)
2. 完成依赖路径解析（相对路径 => 绝对路径）
3. 对依赖文件进行 1/2 操作（深度优先遍历-栈或递归），得到完整依赖图
4. 生成代码（立即执行函数），实现 require 方法
5. 输出文件
