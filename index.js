import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmRawTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import { Command } from "commander";
import fs from 'fs';
import os from 'os';
import path from 'path';
const program = new Command();

program.name("solana-cli")
.description("Solana CLI App")
.version("1.0.0")
let CONFIG_PATH = path.join(os.homedir(),'.configPath')


let connection = new Connection(loadConfig())

program.command('generate').
description('generates a key pair, stores the private locally and display the public key')
.action(()=>{
    const keypair = Keypair.generate();
    const pubKey = keypair.publicKey.toBase58();
    const privateKey = keypair.secretKey
    const keyPath = path.join(os.homedir(), '.key.json');
    fs.writeFileSync(keyPath,
            JSON.stringify(Array.from(privateKey)),
            { mode: 0o600 } 
        )

    console.log("Public Key generated ",pubKey);
    console.log("Private key is written to ~/.key.json")   
})

program.command('balance')
.description('displays balance of a publickey')
.argument('pubkey')
.action(async (pubKey)=>{
    const balance =await connection.getBalance(new PublicKey(pubKey));
    console.log("Balance ",balance/LAMPORTS_PER_SOL, "SOL")
})

program.command('airdrop')
.description('airdrops sol to the account stored locally')
.argument('lamports')
.action(async(lamports)=>{
    lamports = Number(lamports)
    const keyPath = path.join(os.homedir(), '.key.json');
    const data = fs.readFileSync(keyPath,'utf8')
    const keyPair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(data)));
    const signature = await connection.requestAirdrop(keyPair.publicKey,lamports);
    console.log("signature ",signature);
})

program.command('send')
.description('sends sol to recipient')
.argument('recipient')
.argument('lamports')
.action(async (recipient,lamports)=>{
    lamports = Number(lamports);
    const keyPath = path.join(os.homedir(), '.key.json');
    const data = fs.readFileSync(keyPath,'utf8')
    const keyPair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(data)));

    const recipientPubKey = new PublicKey(recipient);

    const tx = new Transaction().add(
        SystemProgram.transfer(
            {
                fromPubkey: keyPair.publicKey,
                toPubkey: recipientPubKey,
                lamports,
            }
        )
    )
    const {blockhash} = await connection.getLatestBlockhash();
    tx.recentBlockhash=blockhash;
    tx.feePayer = keyPair.publicKey;
    tx.sign(keyPair);

    const signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(signature, "confirmed");
    console.log("signature",signature);
})

program.command("getcluster")
.description("gets solana cluster details")
.action(()=>{
    let connection = new Connection(loadConfig())
    console.log("connection url: ",connection.rpcEndpoint)
})

program.command("set-url")
.description('changes solana cluster')
.argument("url")
.action(async (url)=>{
     fs.writeFileSync(CONFIG_PATH,url,'utf8')
     console.log("url set to ",url)
})

program.parse(process.argv)





function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
      return 'http://127.0.0.1:8899';
    }
    return fs.readFileSync(CONFIG_PATH, 'utf8');
}