import dynamic from 'next/dynamic'
const App = dynamic(() => import('../components/FeasX'), {
  ssr: false,
  loading: () => (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#F7F3EC',fontFamily:'sans-serif',color:'#8B6F47',fontSize:16}}>
      กำลังโหลด FeasX...
    </div>
  )
})
export default function Home() {
  return <App />
}
