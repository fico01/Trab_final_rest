const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = 8000;

app.use(express.json());

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'trabalho_final', 
    password: '12345', 
    port: 5432,
});

// Criar a tabela automaticamente ao iniciar
const setupTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS produtos (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                preco DECIMAL(10,2) NOT NULL,
                categoria VARCHAR(50) NOT NULL,
                estoque INTEGER DEFAULT 0
            )
        `);
        console.log("✅ Conectado ao Postgres. Tabela 'produtos' pronta.");
    } catch (err) {
        console.error("❌ Erro ao conectar no banco:", err.message);
    }
};
setupTable();

app.get('/api/produtos', async (req, res) => {
    try {
        let { nome, categoria, order, page = 1, limit = 5 } = req.query;
        const offset = (page - 1) * limit;
        
        let query = "SELECT * FROM produtos WHERE 1=1";
        let params = [];
        let count = 1;

        if (nome) {
            query += ` AND nome ILIKE $${count}`;
            params.push(`%${nome}%`);
            count++;
        }
        if (categoria) {
            query += ` AND categoria = $${count}`;
            params.push(categoria);
            count++;
        }

        const camposPermitidos = ['nome', 'preco', 'estoque'];
        if (order && camposPermitidos.includes(order)) {
            query += ` ORDER BY ${order} ASC`;
        } else {
            query += ` ORDER BY id ASC`;
        }

        query += ` LIMIT $${count} OFFSET $${count + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);
        res.status(200).json({
            pagina: parseInt(page),
            limite: parseInt(limit),
            total_na_pagina: result.rows.length,
            data: result.rows
        });
    } catch (err) {
        res.status(500).json({ erro: "Erro ao buscar dados." });
    }
});

app.get('/api/produtos/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM produtos WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ erro: "Produto não encontrado." });
        res.status(200).json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ erro: "ID inválido." });
    }
});

app.post('/api/produtos', async (req, res) => {
    const { nome, preco, categoria, estoque } = req.body;
    
    if (!nome || typeof preco !== 'number' || !categoria) {
        return res.status(400).json({ erro: "Campos obrigatórios: nome, preco (número) e categoria." });
    }

    try {
        const result = await pool.query(
            'INSERT INTO produtos (nome, preco, categoria, estoque) VALUES ($1, $2, $3, $4) RETURNING *',
            [nome, preco, categoria, estoque || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ erro: "Erro ao inserir produto." });
    }
});

app.put('/api/produtos/:id', async (req, res) => {
    const { nome, preco, categoria, estoque } = req.body;
    try {
        const result = await pool.query(
            'UPDATE produtos SET nome = $1, preco = $2, categoria = $3, estoque = $4 WHERE id = $5 RETURNING *',
            [nome, preco, categoria, estoque, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ erro: "Produto não encontrado." });
        res.status(200).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ erro: "Erro ao atualizar." });
    }
});

app.delete('/api/produtos/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM produtos WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ erro: "Produto não encontrado." });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ erro: "Erro ao deletar." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});