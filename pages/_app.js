import Head from 'next/head'
export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>FeasX — Smart Real Estate Feasibility</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
