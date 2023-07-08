import Head from 'next/head'
import Guess from '@/components/Guess'

export default function Home() {
  return (
    <>
      <Head>
        <title>Wordle WS</title>
      </Head>
      <main>
        <Guess />
        <Guess />
        <Guess />
        <Guess />
        <Guess />
        <Guess />
      </main>
    </>
  )
}
