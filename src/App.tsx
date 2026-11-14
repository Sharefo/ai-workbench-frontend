import { useState } from 'react'
import { App as AntdApp, ConfigProvider, Layout, Tabs } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { HomePage } from './pages/HomePage'
import { SqlLabPage } from './pages/SqlLabPage'
import './App.css'
import './styles/sqllab.css'
import './styles/sqllab-polish.css'

export default function App() {
  const [tab, setTab] = useState('home')

  const goTab = (next: string) => {
    setTab(next)
    window.scrollTo({ top: 0 })
  }

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{ token: { colorPrimary: '#1677ff', borderRadius: 6, fontSize: 13 } }}
    >
      <AntdApp>
        {tab === 'home' ? (
          /* 官网首页：整页自带导航与轮播首屏，不套后台 Layout */
          <HomePage onGoSql={() => goTab('sql')} />
        ) : (
          <Layout className="app-layout">
            <Layout.Header className="app-header">
              <span className="logo" role="button" style={{ cursor: 'pointer' }} onClick={() => goTab('home')}>
                AI 工作台
              </span>
              <Tabs
                className="app-tabs"
                activeKey={tab}
                onChange={goTab}
                items={[
                  { key: 'home', label: '首页' },
                  { key: 'sql', label: 'SQL 实验室' },
                ]}
              />
            </Layout.Header>
            <Layout.Content className="app-content sql-enter">
              <SqlLabPage />
            </Layout.Content>
          </Layout>
        )}
      </AntdApp>
    </ConfigProvider>
  )
}
