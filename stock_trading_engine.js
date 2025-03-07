class Order {
  constructor(type, ticker, quantity, price) {
    this.type = type;
    this.ticker = ticker;
    this.quantity = quantity;
    this.price = price;
    this.next = null;
  }
}

class OrderBook {
  constructor() {
    this.MAX_TICKERS = 1024;
    this.buyOrders = Array(this.MAX_TICKERS).fill(null);
    this.sellOrders = Array(this.MAX_TICKERS).fill(null);
    this.locks = new Array(this.MAX_TICKERS).fill(false);
  }

  getTickerIndex(ticker) {
    let hash = 0;
    for (let i = 0; i < ticker.length; i++) {
      hash = (hash * 31 + ticker.charCodeAt(i)) % this.MAX_TICKERS;
    }
    return hash;
  }

  async addOrder(type, ticker, quantity, price) {
    const index = this.getTickerIndex(ticker);
    const newOrder = new Order(type, ticker, quantity, price);

    // Wait if another order for this ticker is being processed
    while (this.locks[index]) await new Promise((r) => setTimeout(r, 1));
    // Acquire lock for this ticker to safely process the order
    this.locks[index] = true;

    if (type === "BUY") {
      newOrder.next = this.buyOrders[index];
      this.buyOrders[index] = newOrder;
    } else {
      newOrder.next = this.sellOrders[index];
      this.sellOrders[index] = newOrder;
    }

    // Attempt to match and execute trades if possible
    this.matchOrder(ticker);
    // Release lock so other orders for this ticker can be processed
    this.locks[index] = false;
  }

  matchOrder(ticker) {
    // Get the index for this stock ticker
    const index = this.getTickerIndex(ticker);

    // Get the first buy order (highest buyer)
    let buyHead = this.buyOrders[index];
    // Get the first sell order (cheapest seller)
    let sellHead = this.sellOrders[index];

    // Keep matching orders while we have both buyers and sellers
    while (buyHead && sellHead) {
      // Check if the buyer is willing to pay at least the seller's price
      if (buyHead.price >= sellHead.price) {
        // Find the number of shares that can be traded (smallest quantity)
        let tradedQty = Math.min(buyHead.quantity, sellHead.quantity);

        // Reduce the number of shares in each order
        buyHead.quantity -= tradedQty;
        sellHead.quantity -= tradedQty;

        // Log the trade details
        console.log(`Matched ${tradedQty} shares of ${ticker} at $${sellHead.price}`);

        // If the buyer has no more shares left to buy, move to the next buyer
        if (buyHead.quantity === 0) this.buyOrders[index] = buyHead.next;
        // If the seller has no more shares left to sell, move to the next seller
        if (sellHead.quantity === 0) this.sellOrders[index] = sellHead.next;
      } else {
        // Stop if the buyer isn't willing to pay the seller's price
        break;
      }

      // Update buyHead and sellHead to the next available orders
      buyHead = this.buyOrders[index];
      sellHead = this.sellOrders[index];
    }
  }
}

const orderBook = new OrderBook();

async function simulateTrading() {
  const tickers = ["AAPL", "GOOGL", "MSFT", "TSLA"];
  const type = Math.random() > 0.5 ? "BUY" : "SELL";
  const ticker = tickers[Math.floor(Math.random() * tickers.length)];
  const quantity = Math.floor(Math.random() * 100) + 1;
  const price = (100 + Math.random() * 50).toFixed(2);

  await orderBook.addOrder(type, ticker, quantity, parseFloat(price));
}

async function runSimulation() {
  const traders = [];
  for (let i = 0; i < 1000; i++) {
    traders.push(simulateTrading());
  }
  await Promise.all(traders);
}

runSimulation();
