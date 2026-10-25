import { useState } from 'react'
import { App as AntdApp, ConfigProvider, Layout, Tabs } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { HomePage } from './pages/HomePage'
import { SqlLabPage } from './pages/SqlLabPage'
import './App.css'
import './styles/sqllab.css'

export default function App() {
  const [tab, setTab] = useState('home')

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{ token: { colorPrimary: '#1677ff', borderRadius: 6, fontSize: 13 } }}
    >
      <AntdApp>
        <Layout className="app-layout">
          <Layout.Header className="app-header">
            <span className="logo">AI 工作台</span>
            <Tabs
              className="app-tabs"
              activeKey={tab}
              onChange={setTab}
              items={[
                { key: 'home', label: '首页' },
                { key: 'sql', label: 'SQL 实验室' },
              ]}
            />
          </Layout.Header>
          <Layout.Content className="app-content">
            {tab === 'home' ? <HomePage onGoSql={() => setTab('sql')} /> : <SqlLabPage />}
          </Layout.Content>
        </Layout>
      </AntdApp>
    </ConfigProvider>
  )
}
