import { Link } from 'react-router-dom'

const FEATURES = [
  {
    icon: '🎯',
    title: '核心素养诊断',
    desc: '基于物理课标四维框架（物理观念、科学思维、科学探究、科学态度），通过AI问答精准评估核心素养水平。',
  },
  {
    icon: '📊',
    title: '可视化评分',
    desc: '雷达图呈现4大核心素养维度得分，细到10个二级指标的详细表现，直观看清强项与薄弱环节。',
  },
  {
    icon: '📈',
    title: '进度追踪',
    desc: '每次诊断结果自动保存，可以对比不同时间段的学情变化，见证你的进步。',
  },
  {
    icon: '📖',
    title: 'FAQ知识库',
    desc: '内置20+条牛顿定律常见问题与详细解答，随时查阅，帮助巩固知识点。',
  },
]

export default function Home() {
  return (
    <div className="space-y-10">
      {/* Hero 区域 */}
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl shadow-lg mb-6">
          <span className="text-4xl">🔬</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          高中物理学情诊断助手
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          基于 AI 的牛顿定律智能诊断系统，以物理核心素养为框架全面评估你的学习状况
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/student-info" className="btn-primary text-lg px-8 py-3 shadow-lg shadow-primary-500/30">
            🚀 开始诊断
          </Link>
          <Link to="/faq" className="btn-secondary text-lg px-8 py-3">
            📖 查看FAQ
          </Link>
        </div>
      </div>

      {/* 诊断流程 */}
      <div className="card p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">诊断流程</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: '1', title: '填写信息', desc: '输入你的年级、学习进度和想诊断的知识点' },
            { step: '2', title: 'AI问答', desc: '与AI教师多轮对话，回答精心设计的题目' },
            { step: '3', title: '核心素养评分', desc: '基于课标四维框架评估你的核心素养水平' },
            { step: '4', title: '获取报告', desc: '查看雷达图诊断结果和针对性学习建议' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                {item.step}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 功能特点 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {FEATURES.map((feat) => (
          <div key={feat.title} className="card hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">{feat.icon}</div>
            <h3 className="font-semibold text-gray-900 mb-2">{feat.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </div>

      {/* 评价框架说明 */}
      <div className="card p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">评价框架</h2>
        <p className="text-gray-600 mb-2">
          基于《普通高中物理课程标准(2017版2020修订)》物理核心素养体系，采用层次分析法(AHP)确定权重。
        </p>
        <p className="text-xs text-gray-400 mb-6">
          权重来源：姚远(2019)《基于物理核心素养的高中物理课堂教学与评价研究》，40名高中物理教师问卷
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 px-4 font-semibold text-gray-900">核心素养维度</th>
                <th className="py-3 px-4 font-semibold text-gray-900">二级指标</th>
                <th className="py-3 px-4 font-semibold text-gray-900">维度权重</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-3 px-4 font-medium text-blue-700" rowSpan={1}>物理观念 (19.1%)</td>
                <td className="py-3 px-4">知识应用</td>
                <td className="py-3 px-4 text-gray-500">100%</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-green-700" rowSpan={3}>科学思维 (36.1%)</td>
                <td className="py-3 px-4">模型建构</td>
                <td className="py-3 px-4 text-gray-500">19.9%</td>
              </tr>
              <tr>
                <td className="py-3 px-4">分析推理</td>
                <td className="py-3 px-4 text-gray-500">24.0%</td>
              </tr>
              <tr>
                <td className="py-3 px-4">批判创新</td>
                <td className="py-3 px-4 text-gray-500">56.1%</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-amber-700" rowSpan={3}>科学探究 (21.8%)</td>
                <td className="py-3 px-4">提出问题</td>
                <td className="py-3 px-4 text-gray-500">15.2%</td>
              </tr>
              <tr>
                <td className="py-3 px-4">理性探究</td>
                <td className="py-3 px-4 text-gray-500">57.4%</td>
              </tr>
              <tr>
                <td className="py-3 px-4">表达交流</td>
                <td className="py-3 px-4 text-gray-500">27.4%</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-purple-700" rowSpan={3}>科学态度与责任 (23.0%)</td>
                <td className="py-3 px-4">探究意识</td>
                <td className="py-3 px-4 text-gray-500">60.1%</td>
              </tr>
              <tr>
                <td className="py-3 px-4">合作学习</td>
                <td className="py-3 px-4 text-gray-500">22.4%</td>
              </tr>
              <tr>
                <td className="py-3 px-4">STSE</td>
                <td className="py-3 px-4 text-gray-500">17.5%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          总分 = Σ(一级维度得分 × 一级维度权重)，一级维度得分 = Σ(二级维度平均分 × 二维内权重)
        </p>
      </div>
    </div>
  )
}
