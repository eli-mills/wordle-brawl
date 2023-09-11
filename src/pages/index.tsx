import Head from 'next/head'
import Guess from '@/components/Guess'
import 'react-simple-keyboard/build/css/index.css'
import kb from '@/styles/Keyboard.module.css'

export default function Home() {

  return (
    <>
      <Head>
        <title>Wordle WS</title>
      </Head>
      <main>
        <GamePanel />
        <InfoPanel />
      </main>
    </>
  )
}
