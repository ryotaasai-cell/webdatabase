const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = 5000;

const pool = new Pool({
    host: "localhost",
    user: "postgres",
    password: "rjmr4781",
    database: "products",
    port: 5433,
});

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');

app.get('/', async (req, res) => {
    try {
        const productResult = await pool.query('SELECT * FROM products');
        const productItems = productResult.rows;

        const categoryResult = await pool.query('SELECT * FROM categories');
        const categoryItems = categoryResult.rows;

        res.render('index', { productItems, categoryItems });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/addCategory', async (req, res) => {
    const { category_name } = req.body;

    try {
        await pool.query('INSERT INTO categories (category_name) VALUES ($1)', [category_name]);
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send(`Internal Server Error: ${err.message}`);
    }
});

app.post('/addProduct', async (req, res) => {
    const { 商品名, 値段, 在庫, 説明, カテゴリーid } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // トランザクションの開始

        // 商品の追加のための排他ロック
        await client.query('SELECT * FROM products WHERE カテゴリーid = $1 FOR UPDATE', [カテゴリーid]);

        // 商品の追加処理
        await client.query('INSERT INTO products (商品名, 値段, 在庫, 説明, カテゴリーid) VALUES ($1, $2, $3, $4, $5)',
            [商品名, 値段, 在庫, 説明, カテゴリーid]);

        await client.query('COMMIT'); // コミットしてトランザクションを確定
        res.redirect('/');
    } catch (err) {
        await client.query('ROLLBACK'); // エラー時にはロールバックしてトランザクションを取り消し
        console.error(err);
        res.status(500).send(`Internal Server Error: ${err.message}`);
    } finally {
        client.release(); // クライアントの解放
    }
});

app.post('/deleteProduct', async (req, res) => {
    const { 商品名, カテゴリーid } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // トランザクションの開始

        if (商品名) {
            // 商品名に基づく削除
            await client.query('DELETE FROM products WHERE 商品名 = $1', [商品名]);
        } else if (カテゴリーid) {
            // カテゴリーIDに基づく削除
            await client.query('DELETE FROM products WHERE カテゴリーid = $1', [カテゴリーid]);
        }

        await client.query('COMMIT'); // コミットしてトランザクションを確定
        res.redirect('/');
    } catch (err) {
        await client.query('ROLLBACK'); // エラー時にはロールバックしてトランザクションを取り消し
        console.error(err);
        res.status(500).send(`Internal Server Error: ${err.message}`);
    } finally {
        client.release(); // クライアントの解放
    }
});





app.post('/updateStock', async (req, res) => {
    const { 商品名, 新しい在庫 } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // トランザクションの開始

        // 商品の在庫更新のための排他ロック
        await client.query('SELECT * FROM products WHERE 商品名 = $1 FOR UPDATE', [商品名]);

        // 在庫の更新処理
        await client.query('UPDATE products SET 在庫 = $1 WHERE 商品名 = $2', [新しい在庫, 商品名]);

        await client.query('COMMIT'); // コミットしてトランザクションを確定
        res.redirect('/');
    } catch (err) {
        await client.query('ROLLBACK'); // エラー時にはロールバックしてトランザクションを取り消し
        console.error(err);
        res.status(500).send(`Internal Server Error: ${err.message}`);
    } finally {
        client.release(); // クライアントの解放
    }
});

app.listen(port, () => {
    console.log(`サーバーが http://localhost:${port} で実行中です`);
});