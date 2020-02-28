const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');
const { transformFromAst } = require('@babel/core');
const traverse = require('@babel/traverse').default;

const config = require('./minipack.config.js');

/**
 * 入口文件路径
 */
const entry = config.entry;

/**
 * @typedef {Object} Result
 * @property {string[]} dependencies - 依赖模块数组
 * @property {string} code - 经过转换后的代码字符串
 */

/**
 * 解析文件内容及其依赖
 * @param {string} filename 文件路径
 * @returns {Result} 返回结果
 */
function createAsset(filename) {
  /**
   * 入口文件内容
   */
  const content = fs.readFileSync(filename, 'utf-8');

  /**
   * 获取AST
   */
  const ast = babelParser.parse(content, { sourceType: 'module' });

  /**
   * 语法转译
   */
  const { code } = transformFromAst(ast, null, {
    presets: ['@babel/preset-env'],
  });

  /**
   * 遍历AST，获取依赖
   */
  const dependencies = [];
  traverse(ast, {
    ImportDeclaration: ({ node }) => {
      dependencies.push(node.source.value);
    },
  });

  return {
    code,
    dependencies,
  };
}

/**
 * 创建依赖关系图
 */
function createGraph(graph) {
  const stack = Object.entries(graph);

  while (stack.length) {
    // 出栈
    const [filename, assert] = stack.pop();
    // 当前文件的依赖文件的路径映射关系 相对路径=>绝对绝对路径
    assert.mapping = {};
    // 获取当前文件所在文件夹绝对路径
    const dirname = path.dirname(filename);
    assert.dependencies.forEach(depRelativePath => {
      // 依赖文件绝对路径
      const depAbsolutePath = path.join(dirname, depRelativePath);
      // 完成路径映射
      assert.mapping[depRelativePath] = depAbsolutePath;
      // 若当前依赖图中不存在该依赖文件
      if (!Object.keys(graph).includes(depAbsolutePath)) {
        const depAssert = createAsset(depAbsolutePath);
        // 依赖图新增节点
        graph[depAbsolutePath] = depAssert;
        // 若该依赖文件存在依赖 入栈重复过程 完成依赖映射以及节点新增
        depAssert.dependencies.length && stack.push([depAbsolutePath, depAssert]);
      }
    });
  }

  return graph;
}

/**
 * 入口文件内容及其依赖
 */
const mainAssert = createAsset(entry);

console.log(createGraph({ [entry]: mainAssert }));
