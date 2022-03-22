const table = document.querySelector('#table')
const loader = document.querySelector('#loader')
const container = document.querySelector('.container')
const toolTip = document.createElement('span')
let storeCurrency = null
container.append(toolTip)

function initListeners() {
    let timerId = null
    const list = table?.tBodies[0]?.children
    if (!list) return console.error('не получен список узлов из таблицы')
    ;[...list].forEach((el) => {
        el.addEventListener('mousemove', function (e) {
            if (timerId) clearTimeout(timerId)
            toolTip.style.display = 'none'

            const pd = 20 // отступ

            timerId = setTimeout(() => {
                toolTip.innerHTML = el.dataset.item
                toolTip.style.display = 'block'

                const posY =
                    table.offsetHeight - el.offsetHeight <
                    e.pageY - container.offsetTop + pd
                        ? e.pageY -
                          container.offsetTop -
                          el.offsetHeight -
                          pd / 3
                        : e.pageY - container.offsetTop + pd

                const posX =
                    e.clientX - container.offsetLeft - toolTip.offsetWidth / 2 <
                    0
                        ? 0
                        : e.clientX -
                              container.offsetLeft -
                              toolTip.offsetWidth / 2 >
                          table.offsetWidth - toolTip.offsetWidth
                        ? table.offsetWidth - toolTip.offsetWidth
                        : e.clientX -
                          container.offsetLeft -
                          toolTip.offsetWidth / 2

                if (posY >= e.pageY) {
                    toolTip.classList.remove('bottom')
                } else {
                    toolTip.classList.add('bottom')
                }

                toolTip.style.left = posX + 'px'
                toolTip.style.top = posY + 'px'
            }, 500)

            el.onmouseout = function () {
                clearTimeout(timerId)
                this.onmouseout = null
            }
        })
    })
}

function fillTable(listObj) {
    const bodyList = []
    for (const item of Object.values(listObj)) {
        const tr = document.createElement('tr')
        // a = item.Value
        // b = item.Previous
        let result = 0
        const different = item.Value !== item.Previous
        const isLower = item.Value < item.Previous
        if (isLower) {
            result = ((item.Previous - item.Value) / item.Value) * 100
        } else {
            result = ((item.Value - item.Previous) / item.Value) * 100
        }

        tr.setAttribute('data-item', item.Name)
        tr.setAttribute('data-id', item.ID)
        tr.insertAdjacentHTML(
            'beforeend',
            `
            <td>${item.NumCode}</td>
            <td>${item.CharCode}</td>
            <td>${item.Nominal}</td>
            <td>${item.Value}</td>
            <td style='color: ${
                different ? (isLower ? 'red' : 'green') : '#333333'
            }'>${result.toFixed(2)}% ${
                different ? (isLower ? '&#11015;' : '&#11014;') : ''
            }</td>
        `
        )

        tr.onclick = async function (e) {
            showModal(this.dataset.id)
        }

        bodyList.push(tr)
    }

    table?.tBodies[0].append(...bodyList)
}

async function getDataForTenDays() {
    const day = 86400000
    const formatDate = (d) => d.toISOString().slice(0, 10).replace(/-/g, '/')
    const curList = []
    const curDate = new Date()

    let i = 1
    while (curList.length < 10) {
        try {
            const d = formatDate(new Date(curDate.getTime() - i * day))
            const res = await getListCurrency(
                `https://www.cbr-xml-daily.ru/archive/${d}/daily_json.js`
            )
            curList.push(res)
        } catch {
        } finally {
            i++
        }
    }

    return curList
}

async function getListCurrency(url) {
    let result = null
    try {
        const res = await fetch(url)
        if (res.ok) {
            result = await res.json()
        } else {
            throw Error('Читай статус ответа!')
        }
    } catch (err) {
        if (err) {
            err.message += 'Что-то пошло не так во время загрузки валют\n'
            throw err
        }
    }

    return result
}

function addCaptionDate(date, prevDate) {
    const caption = document.createElement('caption')
    caption.innerHTML = `${date} &rArr; ${prevDate}`
    table.prepend(caption)
}

function showModal(id) {
    const formatDate = (d) => d.toISOString().slice(0, 10)

    const modal = document.createElement('div')
    const stat = document.createElement('div')
    const close = document.createElement('div')
    close.onclick = function () {
        modal.remove()
    }
    modal.className = 'modal'
    stat.className = ' stat'
    close.className = 'close'
    close.innerHTML = 'x'

    const arr = storeCurrency.map((item) => {
        const obj = {
            date: formatDate(new Date(item.Date)),
        }

        for (const val in item.Valute) {
            if (item.Valute[val].ID === id) {
                obj.currency = item.Valute[val]
                break
            }
        }

        return obj
    })

    const h = document.createElement('h4')
    h.innerHTML = arr[0].currency.Name

    const ul = document.createElement('ul')
    for (const item of arr) {
        const li = document.createElement('li')
        li.innerHTML = `<p><b>${item.date}</b> - ${item.currency.Value}</p>`
        ul.append(li)
    }

    stat.append(h)
    stat.append(ul)
    stat.append(close)
    modal.append(stat)
    document.body.append(modal)
}

async function showTable() {
    try {
        const jsonObj = await getListCurrency(
            'https://www.cbr-xml-daily.ru/daily_json.js'
        )
        addCaptionDate(
            new Date(jsonObj.Date).toLocaleString(),
            new Date(jsonObj.PreviousDate).toLocaleString()
        )

        storeCurrency = await getDataForTenDays()
        loader.remove()
        fillTable(jsonObj.Valute)
        initListeners()
    } catch (err) {
        console.log(err)
    }
}
showTable()
