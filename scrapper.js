const puppeteer = require('puppeteer');
const fs = require('fs')

const scrap = async () => {
  const browser = await puppeteer.launch({ headless: false });
  const jokes = [];
  try {
    const page = await browser.newPage();
    await page.goto('https://www.piadas.com.br/?page=0');


    for (let index = 0; index < 1000; index++) {
      const [canChangePage, currentPage] = await page.evaluate(async ({ index }) => {
        const [, currentPage] = location.search.split('=')
        return [index / 10 >= +currentPage + 1, currentPage]
      }, { index })

      if (canChangePage)
        await page.goto(`https://www.piadas.com.br/?page=${+currentPage + 1}`)

      const jokeUrl = await page.evaluate(({ index }) => {
        const idx = String(index)[String(index).length - 1]
        const node = document.querySelectorAll('.views-row')[idx]
        if (!node) return null;
        return node
          .querySelector('.node__title')
          .querySelector('a')
          .getAttribute('href')
      }, { index })
      if (!jokeUrl) continue;

      try {
        const jokePage = await browser.newPage();
        await jokePage.goto(`https://www.piadas.com.br${jokeUrl}`);

        const joke = await jokePage.evaluate(() => {
          const node = document.querySelector('.main-content__container')
          if (!node) return null;

          const category = node.querySelector('.field--tags__item')
          if (!category) return null;

          const content = node.querySelector('.text-content');;
          if (!content) return null

          return {
            title: node
            .querySelector('.page-title')
              .querySelector('span')
              .innerText,
            category: category
              .querySelector('a')
              .innerText
              .replaceAll('Piadas de ', '')
              .replaceAll('Piadas do ', '')
              .replaceAll('Piadas ', ''),
            joke: Array
            .from(content.querySelectorAll('p'))
            .map((p) => p.innerText.replaceAll('-', '').split('\n').filter(Boolean))
              .reduce((previous, current) => [...previous, ...current], []),
          }
        });
        console.log(joke?.title || 'REJECTED');
        
        if (joke && !joke.category.toLowerCase().includes('imagens'))
        jokes.push(joke)
        await jokePage.close().catch(console.warn);
      } catch (error) {
        console.error(error);
        index--;
        continue;
      }
    }
  } catch (e) {
    console.error('Error:', e)
    console.error(`Writing ${jokes.length} jokes`)
  }

  await fs.writeFile('./jokes.json', JSON.stringify(jokes, null, 2), 'utf8', (e) => {
    if (e) return console.log('Error saving:', e)
    console.log('Success boy!');
  })
  await browser.close();
};

scrap();