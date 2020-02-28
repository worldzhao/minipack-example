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
  Object.entries(graph).forEach(([filename, assert]) => recursionDep(filename, assert));

  return graph;

  /**
   * 递归遍历，获取所有的依赖，其实就是深度优先遍历 可以用栈处理
   * @param {string} filename 文件路径
   * @param {Result} assert
   */
  function recursionDep(filename, assert) {
    // 当前文件依赖的路径映射关系 相对=>绝对
    assert.mapping = {};
    /**
     * 将依赖相对路径转为绝对路径
     */
    // 获取当前文件所在文件夹绝对路径
    const dirname = path.dirname(filename);

    assert.dependencies.forEach(depRelativePath => {
      // 获取依赖文件绝对路径
      const depAbsolutePath = path.join(dirname, depRelativePath);
      // 完成映射
      assert.mapping[depRelativePath] = depAbsolutePath;
      // 若依赖图中暂时不存在该依赖，将其放入依赖图
      if (!(depAbsolutePath in graph)) {
        const depAsset = createAsset(depAbsolutePath);
        graph[depAbsolutePath] = depAsset;
        // 递归操作依赖的依赖
        depAsset.dependencies.length && recursionDep(depAbsolutePath, depAsset);
      }
    });
  }
}

/**
 * 入口文件内容及其依赖
 */
const mainAssert = createAsset(entry);

console.log(createGraph({ [entry]: mainAssert }));
