const { expect } = require("chai");
const { ethers } = require("hardhat");

/*
тестировать:
контракт называется LaborWendingMachineContract
контракт Ownable

произвольный пользователь (заказчик) может депонировать на контракте нфт "ProletariatDaoPrdContract"
одновременно с депонированием нфт, пользователь указывает адрес исполнителя, который будет выполнять работу
после депонирования "ProletariatDaoPrdContract", пользователь должен депонировать на контракте определённую сумму денег
исполнитель должен подтвердить (акцептовать), что депонированная сумма денег достаточна для оплаты работы
исполнитель указывает срок исполнения работы
заказчик должен подтвердить (акцептовать) срок исполнения работы
после этого нфт "ProletariatDaoPrdContract" депонируется на счёте депо исполнителя
с этого момента начинается отсчёт времени исполнения работы
моментом окончания работы является момент, когда исполнитель депонирует на своём счёте депо нфт "ProletariatDaoDodReportContract"
заказчик должен подтвердить (акцептовать) выполнение работы в определённый срок
если заказчик подтверждает (акцептит) выполнение работы в определённый срок, 
или не подтверждает (не акцептит) выполнение работы в определённый срок, сумма денег депонированная на счёте депо заказчика
передаётся исполнителю
если заказчик инициирует спор, нфт "ProletariatDaoPrdContract" и нфт "ProletariatDaoDodReportContract" депонируются на счёт депо
контракта ProletariatDaoArbiterContract
контракт ProletariatDaoArbiterContract принимает решение AcceptLabor или RejectLabor
если решение AcceptLabor, то сумма денег депонированная на счёте депо заказчика передаётся исполнителю
если решение RejectLabor, то сумма денег депонированная на счёте депо заказчика передаётся заказчику
после принятия и исполнения решения, нфт "ProletariatDaoPrdContract" возвращается заказчику, 
нфт "ProletariatDaoDodReportContract" возвращается исполнителю
*/

/*
## Оценка требований к смарт-контракту `LaborWendingMachineContract`

Данный документ анализирует требования к смарт-контракту `LaborWendingMachineContract`, выделяя ключевые функциональные аспекты, данные, события и потенциальные проблемы.

**1. Функциональные требования:**

* **Депонирование NFT заказчиком:**
    * **Действие:** Произвольный пользователь (заказчик) может отправить NFT стандарта ERC-721 с контракта `ProletariatDaoPrdContract` на контракт `LaborWendingMachineContract`.
    * **Данные:**
        * `tokenId` депонируемого NFT.
        * Адрес исполнителя, которому предназначается работа.
    * **Проверки:**
        * Отправитель является владельцем NFT `ProletariatDaoPrdContract` с указанным `tokenId`.
        * Указанный адрес исполнителя является валидным адресом.
    * **Результат:** NFT временно хранится на контракте `LaborWendingMachineContract` в привязке к данному заказу.

* **Депонирование средств заказчиком:**
    * **Действие:** Заказчик, после депонирования NFT, отправляет определенную сумму токенов (предположительно, стандарт ERC-20) на контракт `LaborWendingMachineContract`.
    * **Данные:**
        * Сумма депонируемых токенов.
    * **Проверки:**
        * Отправитель является тем же пользователем, который депонировал NFT.
        * На балансе отправителя достаточно токенов для депонирования.
    * **Результат:** Депонированная сумма токенов хранится на контракте `LaborWendingMachineContract` в привязке к данному заказу.

* **Подтверждение оплаты исполнителем:**
    * **Действие:** Исполнитель подтверждает, что депонированная сумма достаточна для оплаты работы.
    * **Данные:**
        * Идентификатор заказа (можно генерировать при депонировании NFT).
    * **Проверки:**
        * Вызывающий является адресом исполнителя, указанным при депонировании NFT.
        * Статус заказа соответствует ожидаемому (например, "NFT депонирован, ожидание подтверждения оплаты исполнителем").
    * **Результат:** Фиксируется подтверждение исполнителя о достаточности оплаты.

* **Указание срока исполнения исполнителем:**
    * **Действие:** Исполнитель указывает срок исполнения работы (например, в виде timestamp или количества блоков).
    * **Данные:**
        * Срок исполнения.
        * Идентификатор заказа.
    * **Проверки:**
        * Вызывающий является адресом исполнителя.
        * Статус заказа соответствует ожидаемому (например, "Оплата подтверждена исполнителем, ожидание указания срока").
    * **Результат:** Записывается предложенный срок исполнения.

* **Подтверждение срока исполнения заказчиком:**
    * **Действие:** Заказчик подтверждает предложенный исполнителем срок исполнения.
    * **Данные:**
        * Идентификатор заказа.
    * **Проверки:**
        * Вызывающий является адресом заказчика.
        * Статус заказа соответствует ожидаемому (например, "Срок исполнения предложен исполнителем, ожидание подтверждения заказчиком").
    * **Результат:** Фиксируется согласованный срок исполнения. NFT `ProletariatDaoPrdContract` переводится на счет депо исполнителя внутри контракта. Начинается отсчет времени исполнения.

* **Депонирование отчета исполнителем:**
    * **Действие:** Исполнитель отправляет NFT стандарта ERC-721 с контракта `ProletariatDaoDodReportContract` на контракт `LaborWendingMachineContract`.
    * **Данные:**
        * `tokenId` депонируемого NFT.
        * Идентификатор заказа.
    * **Проверки:**
        * Отправитель является адресом исполнителя.
        * Статус заказа соответствует ожидаемому (например, "Работа в процессе").
        * NFT `ProletariatDaoDodReportContract` с указанным `tokenId` существует и принадлежит исполнителю.
    * **Результат:** NFT `ProletariatDaoDodReportContract` временно хранится на контракте `LaborWendingMachineContract` в привязке к данному заказу. Фиксируется момент окончания работы.

* **Подтверждение выполнения работы заказчиком:**
    * **Действие:** Заказчик подтверждает выполнение работы в установленный срок.
    * **Данные:**
        * Идентификатор заказа.
    * **Проверки:**
        * Вызывающий является адресом заказчика.
        * Статус заказа соответствует ожидаемому (например, "Отчет депонирован исполнителем, ожидание подтверждения заказчиком").
        * Срок исполнения не истек (если требуется).
    * **Результат:** Депонированная сумма переводится исполнителю. NFT `ProletariatDaoPrdContract` остается у исполнителя (на его счете депо внутри контракта). NFT `ProletariatDaoDodReportContract` может быть передан заказчику (опционально, можно оставить на контракте для истории).

* **Автоматическое подтверждение при отсутствии действий заказчика:**
    * **Действие:** Если заказчик не подтверждает выполнение работы в течение определенного периода времени после депонирования отчета, происходит автоматическое подтверждение.
    * **Данные:**
        * Идентификатор заказа.
        * Временной интервал для автоматического подтверждения.
    * **Проверки:**
        * Статус заказа соответствует ожидаемому.
        * Прошло достаточно времени с момента депонирования отчета.
    * **Результат:** Аналогично ручному подтверждению заказчиком.

* **Инициирование спора заказчиком:**
    * **Действие:** Заказчик инициирует спор по поводу выполнения работы.
    * **Данные:**
        * Идентификатор заказа.
    * **Проверки:**
        * Вызывающий является адресом заказчика.
        * Статус заказа соответствует ожидаемому (например, "Отчет депонирован исполнителем").
    * **Результат:** NFT `ProletariatDaoPrdContract` (остающийся на счете депо исполнителя) и NFT `ProletariatDaoDodReportContract` переводятся на счет депо контракта `ProletariatDaoArbiterContract`. Статус заказа меняется на "В споре".

* **Разрешение спора арбитром:**
    * **Действие:** Контракт `ProletariatDaoArbiterContract` принимает решение `AcceptLabor` или `RejectLabor`.
    * **Предполагается:** `LaborWendingMachineContract` будет иметь функцию для взаимодействия с `ProletariatDaoArbiterContract` (например, `resolveDispute`).
    * **Данные:**
        * Решение арбитра (`AcceptLabor` или `RejectLabor`).
        * Идентификатор заказа.
    * **Проверки:**
        * Вызывающий является контрактом `ProletariatDaoArbiterContract`.
        * Статус заказа "В споре".
    * **Результат:**
        * **`AcceptLabor`:** Депонированная сумма переводится исполнителю. NFT `ProletariatDaoPrdContract` возвращается заказчику. NFT `ProletariatDaoDodReportContract` возвращается исполнителю.
        * **`RejectLabor`:** Депонированная сумма возвращается заказчику. NFT `ProletariatDaoPrdContract` возвращается заказчику. NFT `ProletariatDaoDodReportContract` возвращается исполнителю.

**2. Требования к данным (State Variables):**

* **Информация о заказах:**
    * Структура данных для хранения информации о каждом заказе, включающая:
        * Уникальный идентификатор заказа.
        * Адрес заказчика.
        * Адрес исполнителя.
        * `tokenId` NFT `ProletariatDaoPrdContract`.
        * Депонированная сумма.
        * Согласованный срок исполнения (timestamp).
        * Статус заказа (например, "Ожидание исполнителя", "В работе", "Выполнено", "В споре").
        * Timestamp депонирования отчета.
        * Другие необходимые параметры.
* **Балансы депо:**
    * Возможно, потребуется вести внутренние балансы депонированных средств и учет хранения NFT для каждого заказа, чтобы отслеживать, где в данный момент находятся активы.
* **Адрес контракта арбитра:**
    * Адрес `ProletariatDaoArbiterContract`.
* **Права владения (Ownable):**
    * Адрес владельца контракта (для администрирования).

**3. Требования к событиям (Events):**

Для отслеживания действий и изменений состояния контракта необходимо генерировать события:

* `NftDeposited(uint256 orderId, address client, address worker, uint256 nftTokenId)`
* `FundsDeposited(uint256 orderId, address client, uint256 amount)`
* `WorkAccepted(uint256 orderId, address worker)`
* `DeadlineProposed(uint256 orderId, address worker, uint256 deadline)`
* `DeadlineAccepted(uint256 orderId, address client, uint256 deadline)`
* `ReportSubmitted(uint256 orderId, address worker, uint256 reportTokenId)`
* `WorkCompleted(uint256 orderId, address client)`
* `WorkCompletedAutomatically(uint256 orderId)`
* `DisputeInitiated(uint256 orderId, address client)`
* `DisputeResolved(uint256 orderId, string resolution)` (где resolution может быть "AcceptLabor" или "RejectLabor")
* `FundsTransferred(uint256 orderId, address to, uint256 amount)`
* `NftTransferred(uint256 orderId, address to, uint256 tokenId, address nftContract)`

**4. Нефункциональные требования:**

* **Безопасность:** Контракт должен быть защищен от уязвимостей, таких как reentrancy attacks, integer overflows/underflows, и несанкционированного доступа.
* **Газ:** Операции должны быть оптимизированы по стоимости газа.
* **Читаемость и поддерживаемость:** Код должен быть написан ясно и понятно для облегчения аудита и будущих изменений.
* **Масштабируемость:**  Возможность обработки большого количества заказов.

**5. Потенциальные проблемы и вопросы:**

* **Обработка ошибок:** Что произойдет, если пользователь попытается выполнить действие в неправильном состоянии заказа? Необходима четкая логика обработки ошибок и возврата соответствующих сообщений.
* **Таймауты:** Необходимо продумать механизмы таймаутов для ситуаций, когда одна из сторон не предпринимает действий (например, исполнитель не подтверждает оплату в течение определенного времени).
* **Идентификация заказов:** Каким образом будет генерироваться и использоваться уникальный идентификатор заказа?
* **Валюта:** В какой валюте будут депонироваться средства? Предполагается ERC-20 токен.
* **Взаимодействие с `ProletariatDaoArbiterContract`:**  Каким образом `LaborWendingMachineContract` будет получать решение от арбитражного контракта? Нужен интерфейс и механизм безопасного вызова.
* **Хранение NFT:**  Как будет реализовано внутреннее хранение NFT на контракте?
* **Обновление контракта:**  Как будет происходить обновление контракта в будущем (если потребуется)?

**6. Требования к тестированию:**

* **Юнит-тесты:**  Необходимо написать юнит-тесты для каждой функции контракта, покрывающие различные сценарии (успешные выполнения, ошибки, граничные случаи).
* **Интеграционные тесты:**  Необходимо протестировать взаимодействие `LaborWendingMachineContract` с контрактами `ProletariatDaoPrdContract` и `ProletariatDaoDodReportContract`, а также потенциально с `ProletariatDaoArbiterContract`.
* **Ручное тестирование:**  Провести ручное тестирование с использованием различных аккаунтов для имитации действий заказчика и исполнителя.
* **Тестирование на газ:**  Измерить потребление газа для ключевых операций.

**Заключение:**

Смарт-контракт `LaborWendingMachineContract` обладает достаточно сложной логикой, требующей аккуратной реализации и тщательного тестирования. Необходимо продумать все этапы взаимодействия между заказчиком и исполнителем, а также механизм разрешения споров. Четкое определение состояний заказа, корректная обработка ошибок и событий будут критически важны для надежной работы контракта. Особое внимание следует уделить безопасности и оптимизации газовых затрат.

*/

describe("LaborWendingMachineContract", () => {
  let laborWendingMachine;
  let prdContract;
  let dodReportContract;
  let arbiterContract;
  let paymentToken;
  let owner;
  let client;
  let worker;
  let arbiter;
  let prdTokenId;
  let reportTokenId;
  let orderId;

  beforeEach(async () => {
    // Get signers
    [owner, client, worker, arbiter] = await ethers.getSigners();

    // Deploy mock contracts
    const MockERC721 = await ethers.getContractFactory("MockERC721");
    prdContract = await MockERC721.deploy("PRD", "PRD");
    dodReportContract = await MockERC721.deploy("DOD", "DOD");

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    paymentToken = await MockERC20.deploy("Payment Token", "PAY");

    const MockArbiter = await ethers.getContractFactory("MockArbiterContract");
    arbiterContract = await MockArbiter.deploy();

    // Deploy main contract
    const LaborWendingMachine = await ethers.getContractFactory("LaborWendingMachineContract");
    laborWendingMachine = await LaborWendingMachine.deploy(
      prdContract.address,
      dodReportContract.address,
      paymentToken.address,
      arbiterContract.address
    );

    // Mint test tokens
    prdTokenId = 1;
    reportTokenId = 1;
    await prdContract.mint(client.address, prdTokenId);
    await dodReportContract.mint(worker.address, reportTokenId);
    await paymentToken.mint(client.address, ethers.utils.parseEther("1000"));
  });

  describe("Deployment", () => {
    it("Should set the correct owner", async () => {
      expect(await laborWendingMachine.owner()).to.equal(owner.address);
    });

    it("Should set the correct contract addresses", async () => {
      expect(await laborWendingMachine.prdContract()).to.equal(prdContract.address);
      expect(await laborWendingMachine.dodReportContract()).to.equal(dodReportContract.address);
      expect(await laborWendingMachine.paymentToken()).to.equal(paymentToken.address);
      expect(await laborWendingMachine.arbiterContract()).to.equal(arbiterContract.address);
    });
  });

  describe("NFT Deposit", () => {
    beforeEach(async () => {
      await prdContract.connect(client).approve(laborWendingMachine.address, prdTokenId);
    });

    it("Should allow client to deposit PRD NFT", async () => {
      await expect(laborWendingMachine.connect(client).depositPrdNft(prdTokenId, worker.address))
        .to.emit(laborWendingMachine, "NftDeposited")
        .withArgs(1, client.address, worker.address, prdTokenId);
    });

    it("Should fail if sender is not NFT owner", async () => {
      await expect(
        laborWendingMachine.connect(worker).depositPrdNft(prdTokenId, worker.address)
      ).to.be.revertedWith("Not token owner");
    });

    it("Should prevent non-client from accepting deadline", async () => {
        await expect(
          laborWendingMachine.connect(worker).acceptDeadline(1)
        ).to.be.revertedWith("Not authorized client");
      });
  });

  describe("Payment Deposit", () => {
    beforeEach(async () => {
      await prdContract.connect(client).approve(laborWendingMachine.address, prdTokenId);
      await laborWendingMachine.connect(client).depositPrdNft(prdTokenId, worker.address);
      await paymentToken.connect(client).approve(laborWendingMachine.address, ethers.utils.parseEther("100"));
    });

    it("Should allow client to deposit payment", async () => {
      const amount = ethers.utils.parseEther("100");
      await expect(laborWendingMachine.connect(client).depositPayment(1, amount))
        .to.emit(laborWendingMachine, "FundsDeposited")
        .withArgs(1, client.address, amount);
    });

    it("Should fail if payment amount is zero", async () => {
      await expect(
        laborWendingMachine.connect(client).depositPayment(1, 0)
      ).to.be.revertedWith("Payment amount must be greater than 0");
    });
  });

  describe("Worker Acceptance", () => {
    beforeEach(async () => {
      // Setup order
      await prdContract.connect(client).approve(laborWendingMachine.address, prdTokenId);
      await laborWendingMachine.connect(client).depositPrdNft(prdTokenId, worker.address);
      const amount = ethers.utils.parseEther("100");
      await paymentToken.connect(client).approve(laborWendingMachine.address, amount);
      await laborWendingMachine.connect(client).depositPayment(1, amount);
    });

    it("Should allow worker to accept payment", async () => {
      await expect(laborWendingMachine.connect(worker).acceptPayment(1))
        .to.emit(laborWendingMachine, "WorkAccepted")
        .withArgs(1, worker.address);
    });

    it("Should allow worker to set deadline", async () => {
      await laborWendingMachine.connect(worker).acceptPayment(1);
      const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
      
      await expect(laborWendingMachine.connect(worker).setDeadline(1, deadline))
        .to.emit(laborWendingMachine, "DeadlineProposed")
        .withArgs(1, worker.address, deadline);
    });

    it("Should prevent double payment acceptance", async () => {
        await laborWendingMachine.connect(worker).acceptPayment(1);
        await expect(
          laborWendingMachine.connect(worker).acceptPayment(1)
        ).to.be.revertedWith("Payment already accepted");
      });
  });

  describe("Client Deadline Acceptance", () => {
    beforeEach(async () => {
      // Setup complete order with deadline
      await prdContract.connect(client).approve(laborWendingMachine.address, prdTokenId);
      await laborWendingMachine.connect(client).depositPrdNft(prdTokenId, worker.address);
      const amount = ethers.utils.parseEther("100");
      await paymentToken.connect(client).approve(laborWendingMachine.address, amount);
      await laborWendingMachine.connect(client).depositPayment(1, amount);
      await laborWendingMachine.connect(worker).acceptPayment(1);
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await laborWendingMachine.connect(worker).setDeadline(1, deadline);
    });

    it("Should allow client to accept deadline", async () => {
      await expect(laborWendingMachine.connect(client).acceptDeadline(1))
        .to.emit(laborWendingMachine, "DeadlineAccepted")
        .withArgs(1, client.address);
    });

    it("Should transfer PRD NFT to worker's depot after deadline acceptance", async () => {
      await laborWendingMachine.connect(client).acceptDeadline(1);
      const depot = await laborWendingMachine.getWorkerDepot(1);
      expect(depot.prdTokenId).to.equal(prdTokenId);
    });

    it("Should correctly update order status", async () => {
        await laborWendingMachine.connect(client).acceptDeadline(1);
        const order = await laborWendingMachine.getOrder(1);
        expect(order.status).to.equal(4); // STATUS_DEADLINE_ACCEPTED
      });
  });

  describe("Work Submission", () => {
    beforeEach(async () => {
      // Setup complete order with accepted deadline
      await prdContract.connect(client).approve(laborWendingMachine.address, prdTokenId);
      await laborWendingMachine.connect(client).depositPrdNft(prdTokenId, worker.address);
      const amount = ethers.utils.parseEther("100");
      await paymentToken.connect(client).approve(laborWendingMachine.address, amount);
      await laborWendingMachine.connect(client).depositPayment(1, amount);
      await laborWendingMachine.connect(worker).acceptPayment(1);
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await laborWendingMachine.connect(worker).setDeadline(1, deadline);
      await laborWendingMachine.connect(client).acceptDeadline(1);
    });

    it("Should allow worker to submit DOD report", async () => {
      await dodReportContract.connect(worker).approve(laborWendingMachine.address, reportTokenId);
      await expect(laborWendingMachine.connect(worker).submitReport(1, reportTokenId))
        .to.emit(laborWendingMachine, "ReportSubmitted")
        .withArgs(1, worker.address, reportTokenId);
    });

    it("Should fail if report submitted after deadline", async () => {
      await network.provider.send("evm_increaseTime", [86401]); // 24 hours + 1 second
      await network.provider.send("evm_mine");
      
      await dodReportContract.connect(worker).approve(laborWendingMachine.address, reportTokenId);
      await expect(
        laborWendingMachine.connect(worker).submitReport(1, reportTokenId)
      ).to.be.revertedWith("Deadline expired");
    });

    it("Should handle exact deadline expiration", async () => {
        const deadline = Math.floor(Date.now() / 1000) + 3600;
        await laborWendingMachine.connect(worker).setDeadline(1, deadline);
        
        await network.provider.send("evm_increaseTime", [3600]);
        await network.provider.send("evm_mine");
        
        await dodReportContract.connect(worker).approve(laborWendingMachine.address, reportTokenId);
        await laborWendingMachine.connect(worker).submitReport(1, reportTokenId);
        expect(await dodReportContract.ownerOf(reportTokenId)).to.equal(laborWendingMachine.address);
      });
  });

  describe("Work Completion and Payment", () => {
    beforeEach(async () => {
      // Setup complete order with submitted report
      await prdContract.connect(client).approve(laborWendingMachine.address, prdTokenId);
      await laborWendingMachine.connect(client).depositPrdNft(prdTokenId, worker.address);
      const amount = ethers.utils.parseEther("100");
      await paymentToken.connect(client).approve(laborWendingMachine.address, amount);
      await laborWendingMachine.connect(client).depositPayment(1, amount);
      await laborWendingMachine.connect(worker).acceptPayment(1);
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await laborWendingMachine.connect(worker).setDeadline(1, deadline);
      await laborWendingMachine.connect(client).acceptDeadline(1);
      await dodReportContract.connect(worker).approve(laborWendingMachine.address, reportTokenId);
      await laborWendingMachine.connect(worker).submitReport(1, reportTokenId);
    });

    it("Should allow client to accept work", async () => {
      await expect(laborWendingMachine.connect(client).acceptWork(1))
        .to.emit(laborWendingMachine, "WorkCompleted")
        .withArgs(1, client.address);
    });

    it("Should transfer payment to worker upon work acceptance", async () => {
      const workerBalanceBefore = await paymentToken.balanceOf(worker.address);
      await laborWendingMachine.connect(client).acceptWork(1);
      const workerBalanceAfter = await paymentToken.balanceOf(worker.address);
      expect(workerBalanceAfter.sub(workerBalanceBefore)).to.equal(ethers.utils.parseEther("100"));
    });
  });

  describe("Dispute Handling", () => {
    beforeEach(async () => {
      // Setup complete order with submitted report
      await prdContract.connect(client).approve(laborWendingMachine.address, prdTokenId);
      await laborWendingMachine.connect(client).depositPrdNft(prdTokenId, worker.address);
      const amount = ethers.utils.parseEther("100");
      await paymentToken.connect(client).approve(laborWendingMachine.address, amount);
      await laborWendingMachine.connect(client).depositPayment(1, amount);
      await laborWendingMachine.connect(worker).acceptPayment(1);
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await laborWendingMachine.connect(worker).setDeadline(1, deadline);
      await laborWendingMachine.connect(client).acceptDeadline(1);
      await dodReportContract.connect(worker).approve(laborWendingMachine.address, reportTokenId);
      await laborWendingMachine.connect(worker).submitReport(1, reportTokenId);
    });

    it("Should allow client to initiate dispute", async () => {
      await expect(laborWendingMachine.connect(client).initiateDispute(1))
        .to.emit(laborWendingMachine, "DisputeInitiated")
        .withArgs(1, client.address);
    });

    it("Should transfer NFTs to arbiter contract during dispute", async () => {
      await laborWendingMachine.connect(client).initiateDispute(1);
      const arbiterBalance = await prdContract.balanceOf(arbiterContract.address);
      expect(arbiterBalance).to.equal(1);
    });

    it("Should handle arbiter acceptance correctly", async () => {
      await laborWendingMachine.connect(client).initiateDispute(1);
      await arbiterContract.resolveDispute(1, true);
      
      // Check payment transferred to worker
      const workerBalance = await paymentToken.balanceOf(worker.address);
      expect(workerBalance).to.equal(ethers.utils.parseEther("100"));
    });

    it("Should handle arbiter rejection correctly", async () => {
      await laborWendingMachine.connect(client).initiateDispute(1);
      await arbiterContract.resolveDispute(1, false);
      
      // Check payment returned to client
      const clientBalance = await paymentToken.balanceOf(client.address);
      expect(clientBalance).to.equal(ethers.utils.parseEther("1000"));
    });

    it("Should prevent duplicate dispute initiation", async () => {
        await laborWendingMachine.connect(client).initiateDispute(1);
        await expect(
          laborWendingMachine.connect(client).initiateDispute(1)
        ).to.be.revertedWith("Dispute already initiated");
      });
  
      it("Should return NFTs after rejected labor", async () => {
        await laborWendingMachine.connect(client).initiateDispute(1);
        await arbiterContract.resolveDispute(1, false);
        
        expect(await prdContract.ownerOf(prdTokenId)).to.equal(client.address);
        expect(await dodReportContract.ownerOf(reportTokenId)).to.equal(worker.address);
      });
  });

  describe("Automatic Completion", () => {
    beforeEach(async () => {
      // Setup complete order with submitted report
      // ... (same setup as before)
    });

    it("Should auto-complete after timeout period", async () => {
      await network.provider.send("evm_increaseTime", [172800]); // 48 hours
      await network.provider.send("evm_mine");

      await expect(laborWendingMachine.checkAutoComplete(1))
        .to.emit(laborWendingMachine, "WorkCompletedAutomatically")
        .withArgs(1);
    });

    it("Should transfer payment to worker on auto-completion", async () => {
      const workerBalanceBefore = await paymentToken.balanceOf(worker.address);
      
      await network.provider.send("evm_increaseTime", [172800]); // 48 hours
      await network.provider.send("evm_mine");
      
      await laborWendingMachine.checkAutoComplete(1);
      
      const workerBalanceAfter = await paymentToken.balanceOf(worker.address);
      expect(workerBalanceAfter.sub(workerBalanceBefore)).to.equal(ethers.utils.parseEther("100"));
    });
  });

  describe("Access Control", () => {
    it("Should only allow owner to update arbiter contract", async () => {
      await expect(
        laborWendingMachine.connect(client).setArbiterContract(ethers.constants.AddressZero)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should only allow worker to accept payment", async () => {
      // Setup order first
      await prdContract.connect(client).approve(laborWendingMachine.address, prdTokenId);
      await laborWendingMachine.connect(client).depositPrdNft(prdTokenId, worker.address);
      
      await expect(
        laborWendingMachine.connect(client).acceptPayment(1)
      ).to.be.revertedWith("Not authorized worker");
    });

    it("Should prevent non-arbiter from resolving disputes", async () => {
        await laborWendingMachine.connect(client).initiateDispute(1);
        await expect(
            laborWendingMachine.connect(client).resolveDispute(1, true)
        ).to.be.revertedWith("Caller is not the arbiter");
        });
  });

  describe("Order Management", () => {
    it("Should revert for non-existent orders", async () => {
      await expect(
        laborWendingMachine.connect(client).depositPayment(999, 100)
      ).to.be.revertedWith("Order does not exist");
    });

    it("Should handle multiple concurrent orders", async () => {
      // Создаем второй заказ
      const prdTokenId2 = 2;
      await prdContract.mint(client.address, prdTokenId2);
      await prdContract.connect(client).approve(laborWendingMachine.address, prdTokenId2);
      await laborWendingMachine.connect(client).depositPrdNft(prdTokenId2, worker.address);
      
      const order2 = await laborWendingMachine.getOrder(2);
      expect(order2.client).to.equal(client.address);
    });
  });

  describe("Edge Cases", () => {
    it("Should prevent work acceptance before report submission", async () => {
      await expect(
        laborWendingMachine.connect(client).acceptWork(1)
      ).to.be.revertedWith("Report not submitted");
    });

    it("Should handle zero-address worker assignment", async () => {
      await expect(
        laborWendingMachine.connect(client).depositPrdNft(prdTokenId, ethers.constants.AddressZero)
      ).to.be.revertedWith("Invalid worker address");
    });
  });
});
