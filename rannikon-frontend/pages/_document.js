import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="fi">
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/png" href="/rannikkopuutarhalogo.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
