# Meu Corre — aplicativo Android

Aplicativo para registrar ganhos de Uber e 99, combustível, despesas, folgas e meta diária de faturamento líquido.

**Observação:** este é o projeto-fonte Android, **não um APK compilado**. Os APKs anteriores, feitos fora do SDK Android, não devem ser utilizados.

## Gerar o APK automaticamente pelo GitHub
1. Crie um repositório **privado** no GitHub.
2. Envie **o conteúdo desta pasta** para a raiz do repositório, preservando `.github/workflows/android-apk.yml`.
3. Acesse a aba **Actions** e escolha **Gerar APK do Meu Corre**.
4. Clique em **Run workflow** (Executar fluxo de trabalho).
5. Quando aparecer um ✓, abra a execução e baixe o artefato **Meu-Corre-Android-APK**.
6. Extraia o ZIP desse artefato. Dentro dele estará o verdadeiro **app-debug.apk** gerado pelo SDK.
7. Transfira o arquivo APK para o Poco X7 Pro, abra-o e siga as instruções de instalação.

> APK de depuração: adequado para testar/uso pessoal, não para publicar na Play Store. O processo remoto de build precisa de conexão com a internet. Não foi validado em um celular real neste ambiente.

## Gerar no Android Studio
- Requisitos: Android Studio atualizado com Android SDK 35, JDK 17 e Gradle 8.9.
- Abra a pasta como projeto, configure Gradle 8.9 se solicitado, sincronize e use **Build → Build APK(s)**.
- APK em `app/build/outputs/apk/debug/app-debug.apk`.

## Dados e privacidade
- Dados financeiros ficam no armazenamento local do aplicativo WebView, sem servidor ou login.
- O botão **Exportar backup** usa o seletor nativo de arquivos do Android. **Restaurar backup** também abre o seletor nativo.
- A WebView intercepta apenas conteúdo incluído no APK. Links externos são bloqueados.
- Sempre exporte um backup antes de trocar de aparelho ou reinstalar o aplicativo, pois desinstalar normalmente apaga seus registros.
- Saldo inicial e contas de exemplo podem ser editados na interface.

## Arquivos
- `app/src/main/assets/`: interface HTML/CSS/JavaScript do Meu Corre
- `app/src/main/java/com/meucorre/financeiro/MainActivity.java`: aplicativo Android WebView
- `app/src/main/AndroidManifest.xml`: configuração Android
- `.github/workflows/android-apk.yml`: compilação oficial automatizada
